const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const vendors = await prisma.vendor.findMany({
    select: { id: true, name: true, mode: true },
  });

  console.log(`Found ${vendors.length} vendors.`);

  for (const v of vendors) {
    console.log(`\nVENDOR: ${v.name} (${v.id}) [${v.mode}]`);

    // Find canteens
    const canteens = await prisma.canteen.findMany({
      where: { vendorId: v.id },
      include: { _count: { select: { menuItems: true } } },
    });

    if (canteens.length === 0) {
      console.log("  -> NO CANTEENS");
      continue;
    }

    for (const c of canteens) {
      console.log(`  -> Canteen: ${c.name} (${c.id})`);
      console.log(`     Items Count: ${c._count.menuItems}`);

      if (c._count.menuItems > 0) {
        const items = await prisma.menuItem.findMany({
          where: { canteenId: c.id },
          take: 3,
          select: { name: true, available: true },
        });
        console.log(
          "     Samples:",
          items.map((i) => `${i.name} (${i.available})`).join(", ")
        );
      }
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
