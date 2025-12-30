const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Finding all email duplicates...");

  // Aggregation to find duplicates
  const pipeline = [
    { $group: { _id: "$email", count: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
  ];

  const agg = await prisma.$runCommandRaw({
    aggregate: "User",
    pipeline: pipeline,
    cursor: {},
  });

  // Aggregation output format check
  // Usually { cursor: { firstBatch: ... } }

  const duplicates = agg.cursor?.firstBatch || [];
  console.log(`Found ${duplicates.length} emails with duplicates.`);

  for (const group of duplicates) {
    const email = group._id;
    console.log(`\nProcessing duplicates for: ${email}`);

    const userDocs = [];
    for (const idObj of group.ids) {
      const oid = idObj.$oid;
      // Fetch full user doc to check orders
      const user = await prisma.user.findUnique({ where: { id: oid } }); // Need full client to get relations count?
      // Using count is faster
      const orderCount = await prisma.order.count({ where: { userId: oid } });
      userDocs.push({ id: oid, orderCount, ...user });
    }

    // Sort: Most orders first, then newest
    userDocs.sort((a, b) => {
      if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
      // If counts equal, prefer the one with "vendor" link? Or recently created?
      // Let's assume created (ObjectId time)
      return b.id.localeCompare(a.id);
    });

    const toKeep = userDocs[0];
    const toDelete = userDocs.slice(1);

    console.log(`Keeping: ${toKeep.id} (${toKeep.orderCount} orders)`);

    for (const u of toDelete) {
      console.log(`Deleting: ${u.id} (${u.orderCount} orders)`);
      await prisma.$runCommandRaw({
        delete: "User",
        deletes: [{ q: { _id: { $oid: u.id } }, limit: 1 }],
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
