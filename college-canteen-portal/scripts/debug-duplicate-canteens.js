const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const canteens = await prisma.canteen.findMany({
    include: {
      vendor: { select: { name: true } },
      _count: { select: { menuItems: true } },
    },
  });

  console.log(`Total Canteens: ${canteens.length}`);

  const byName = {};
  canteens.forEach((c) => {
    if (!byName[c.name]) byName[c.name] = [];
    byName[c.name].push(c);
  });

  Object.keys(byName).forEach((name) => {
    const list = byName[name];
    if (list.length > 1) {
      console.log(`\nDUPLICATE DETECTED: "${name}"`);
      list.forEach((c) => {
        console.log(
          `  - ID: ${c.id} | Vendor: ${c.vendor.name} | Items: ${c._count.menuItems} | Location: ${c.location}`
        );
      });
    } else {
      console.log(
        `\nSINGLE: "${name}" | ID: ${list[0].id} | Vendor: ${list[0].vendor.name} | Items: ${list[0]._count.menuItems}`
      );
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
