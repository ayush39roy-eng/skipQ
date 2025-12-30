const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("--- COUNTING ITEMS ---");

  // 1. Prisma Count
  const prismaCount = await prisma.menuItem.count();
  console.log(`Prisma Count: ${prismaCount}`);

  // 2. Raw Mongo Count
  try {
    const rawRes = await prisma.$runCommandRaw({
      count: "MenuItem",
    });
    console.log(`Raw Mongo Count: ${rawRes.n}`);
  } catch (e) {
    console.log(`Raw Count Error: ${e.message}`);
  }

  const invCount = await prisma.inventoryItem.count();
  console.log(`Inventory Items: ${invCount}`);

  const orderCount = await prisma.order.count();
  console.log(`Orders: ${orderCount}`);

  // Show DB Info
  console.log(
    `DB URL Host: ${process.env.DATABASE_URL.split("@")[1].split("/")[0]}`
  );
  console.log(
    `DB Name: ${process.env.DATABASE_URL.split("/").pop().split("?")[0]}`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
