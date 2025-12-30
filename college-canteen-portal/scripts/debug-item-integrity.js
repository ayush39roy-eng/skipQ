const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const itemCount = await prisma.menuItem.count();
  console.log(`Total Menu Items: ${itemCount}`);

  if (itemCount === 0) {
    console.log("DB is physically empty of menu items.");
    return;
  }

  const sampleItems = await prisma.menuItem.findMany({
    take: 5,
    select: { id: true, name: true, canteenId: true },
  });

  console.log("Sample Items:");
  for (const i of sampleItems) {
    const canteen = await prisma.canteen.findUnique({
      where: { id: i.canteenId },
    });
    console.log(
      `- Item "${i.name}" -> CanteenID: ${i.canteenId} -> Exists? ${!!canteen}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
