const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const totalItems = await prisma.menuItem.count();
  const orphans = await prisma.menuItem.count({ where: { canteenId: null } });
  const valid = await prisma.menuItem.count({
    where: { canteenId: { not: null } },
  });

  console.log(`\nTotal Menu Items: ${totalItems}`);
  console.log(`Orphans (no canteen): ${orphans}`);
  console.log(`Valid (linked): ${valid}`);

  const canteensWithItems = await prisma.canteen.findMany({
    where: { menuItems: { some: {} } },
    include: {
      vendor: { select: { name: true, id: true } },
      _count: { select: { menuItems: true } },
    },
  });

  console.log(`\nCanteens with items (${canteensWithItems.length}):`);
  canteensWithItems.forEach((c) => {
    console.log(
      `- ${c.name} (Vendor: ${c.vendor.name}) -> ${c._count.menuItems} items`
    );
  });

  const multiCanteenVendors = await prisma.vendor.findMany({
    where: { canteens: { some: {} } }, // vendors with canteens
    include: { _count: { select: { canteens: true } } },
  });

  const actualMulti = multiCanteenVendors.filter((v) => v._count.canteens > 1);
  console.log(`\nVendors with MULTIPLE canteens (${actualMulti.length}):`);
  actualMulti.forEach((v) => {
    console.log(`- ${v.name} (${v._count.canteens} canteens)`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
