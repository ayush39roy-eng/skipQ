const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const id = "6922c0bdaddeed30663371ef";
  const c = await prisma.canteen.findUnique({
    where: { id },
    include: {
      menuItems: true,
      _count: { select: { menuItems: true } },
    },
  });

  console.log("--- CANTEEN ...1ef ---");
  if (!c) {
    console.log("Not found");
  } else {
    console.log(`Name: ${c.name}`);
    console.log(`Count (Agg): ${c._count.menuItems}`);
    console.log(`Items (Include): ${c.menuItems.length}`);
    console.log(c.menuItems);
  }
}

main().finally(() => prisma.$disconnect());
