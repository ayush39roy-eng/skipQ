const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const canteens = await prisma.canteen.findMany({
    include: {
      menuItems: { select: { id: true, name: true, available: true } },
      vendor: { select: { name: true } },
    },
  });

  canteens.forEach((c) => {
    if (c.menuItems.length > 0) {
      console.log(
        `\nCanteen: "${c.name}" (ID: ${c.id}) | Vendor: ${c.vendor.name}`
      );
      console.log(`Items count: ${c.menuItems.length}`);
      c.menuItems.forEach((i) =>
        console.log(` - ${i.name} [${i.available ? "Active" : "Hidden"}]`)
      );
    }
  });
}

main().finally(() => prisma.$disconnect());
