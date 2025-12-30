const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const fs = require("fs");
const util = require("util");
const logFile = fs.createWriteStream("scripts/debug-raw-types.log", {
  flags: "w",
});
const log = function (d) {
  logFile.write(util.format(d) + "\n");
  process.stdout.write(util.format(d) + "\n");
};

async function main() {
  // Use runCommandRaw to bypass Prisma's type mapping
  // We explicitly ask for the 'Canteen' collection
  // Check Canteen
  const canteenResult = await prisma.$runCommandRaw({
    find: "Canteen",
    limit: 1,
  });

  if (canteenResult.cursor && canteenResult.cursor.firstBatch) {
    const doc = canteenResult.cursor.firstBatch[0];
    log("--- CANTEEN ---");
    log(`ID: ${JSON.stringify(doc._id)}`);
    log(`VendorID Value: ${doc.vendorId}`);
    log(`VendorID Type: ${typeof doc.vendorId}`);
    log(`Full VendorID Field: ${JSON.stringify(doc.vendorId)}`);
  }

  // Check MenuItem (to compare)
  const menuResult = await prisma.$runCommandRaw({
    find: "MenuItem",
    limit: 1,
  });

  if (menuResult.cursor && menuResult.cursor.firstBatch) {
    const doc = menuResult.cursor.firstBatch[0];
    log("\n--- MENU ITEM ---");
    log(`ID: ${JSON.stringify(doc._id)}`);
    log(`CanteenID Value: ${JSON.stringify(doc.canteenId)}`);
    log(`CanteenID Type: ${typeof doc.canteenId}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
