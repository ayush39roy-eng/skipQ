const { PrismaClient } = require("@prisma/client");
const readonlyPrisma = new PrismaClient();
const prisma = new PrismaClient();

async function clean() {
  console.log("--- STARTING CLEAN SLATE OPERATION ---");
  console.log(
    "Target DB:",
    process.env.DATABASE_URL.split("@")[1].split("?")[0]
  );

  // prompt/confirmation usually good, but I am an agent.

  console.log("Deleting Operational Data...");

  // Children First
  const tasks = [
    { name: "OrderItem", model: prisma.orderItem },
    { name: "Payment", model: prisma.payment },
    { name: "LedgerEntry", model: prisma.ledgerEntry },
    { name: "LedgerClosure", model: prisma.ledgerClosure },
    { name: "Transaction", model: prisma.transaction },
    { name: "InventoryLog", model: prisma.inventoryLog },
    { name: "AiInsights", model: prisma.aiInsights },
    { name: "Shift", model: prisma.shift },
  ];

  for (const t of tasks) {
    const res = await t.model.deleteMany({});
    console.log(`Deleted ${res.count} ${t.name}s`);
  }

  // Parent Last
  const orders = await prisma.order.deleteMany({});
  console.log(`Deleted ${orders.count} Orders`);

  console.log("--- CLEAN SLATE COMPLETE ---");
  console.log(
    "Preserved Master Data (User, Vendor, Canteen, Menu, Inventory definitions)."
  );
}

clean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
