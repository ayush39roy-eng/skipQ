const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const vendors = await prisma.vendor.findMany({
    select: { id: true, name: true },
  });

  console.log(`Checking ${vendors.length} vendors...`);

  for (const v of vendors) {
    const canteens = await prisma.canteen.findMany({
      where: { vendorId: v.id },
      select: { id: true, name: true, _count: { select: { menuItems: true } } },
    });

    if (canteens.length > 0) {
      console.log(`\nVendor: ${v.name} (${v.id})`);
      canteens.forEach((c) => {
        console.log(
          `  - Canteen: "${c.name}" (ID: ${c.id}) -> Items: ${c._count.menuItems}`
        );
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
