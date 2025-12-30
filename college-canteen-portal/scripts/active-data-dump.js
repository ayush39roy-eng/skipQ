const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: "VENDOR" },
    select: { email: true, vendorId: true },
  });

  console.log("--- USERS (VENDOR) ---");
  if (users.length === 0) console.log("No Vendor Users found.");
  users.forEach((u) =>
    console.log(`User: ${u.email} -> Vendor: ${u.vendorId}`)
  );

  const vendors = await prisma.vendor.findMany({
    select: { id: true, name: true },
  });

  console.log("\n--- VENDORS & CONTENT ---");
  for (const v of vendors) {
    const canteens = await prisma.canteen.findMany({
      where: { vendorId: v.id },
      select: { id: true, name: true },
    });

    let totalItems = 0;
    for (const c of canteens) {
      const count = await prisma.menuItem.count({ where: { canteenId: c.id } });
      console.log(`Vendor "${v.name}" (${v.id})`);
      console.log(`   -> Canteen "${c.name}" (${c.id}) : ${count} items`);
      totalItems += count;
    }
    if (canteens.length === 0) {
      console.log(`Vendor "${v.name}" (${v.id}) -> NO CANTEENSHOPS`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
