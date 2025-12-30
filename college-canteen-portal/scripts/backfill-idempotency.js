const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Finding orders with null idempotency key...");

  // Find orders where key is missing or null
  const orders = await prisma.$runCommandRaw({
    find: "Order",
    filter: {
      $or: [{ idempotencyKey: null }, { idempotencyKey: { $exists: false } }],
    },
    projection: { _id: 1 },
  });

  const batch = orders.cursor?.firstBatch || [];
  console.log(`Found ${batch.length} legacy orders.`);

  if (batch.length === 0) return;

  for (const doc of batch) {
    const oid = doc._id.$oid;
    const newKey = `LEGACY-${oid}-${Math.random().toString(36).slice(2)}`;

    await prisma.$runCommandRaw({
      update: "Order",
      updates: [
        {
          q: { _id: { $oid: oid } },
          u: { $set: { idempotencyKey: newKey } },
        },
      ],
    });
    process.stdout.write(".");
  }
  console.log("\nBackfill complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
