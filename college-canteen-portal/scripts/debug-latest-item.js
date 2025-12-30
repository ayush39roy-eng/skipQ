const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const util = require("util");
const logFile = fs.createWriteStream("scripts/debug-latest-item.log", {
  flags: "w",
});
const log = function (d) {
  logFile.write(util.format(d) + "\n");
  process.stdout.write(util.format(d) + "\n");
};

async function main() {
  const result = await prisma.$runCommandRaw({
    find: "MenuItem",
    sort: { _id: -1 },
    limit: 1,
  });

  if (
    result.cursor &&
    result.cursor.firstBatch &&
    result.cursor.firstBatch.length > 0
  ) {
    const doc = result.cursor.firstBatch[0];
    log("--- LATEST MENU ITEM ---");
    log(`Name: ${doc.name}`);
    log(`ID: ${JSON.stringify(doc._id)}`);
    log(`CanteenID: ${JSON.stringify(doc.canteenId)}`);
    log(`SectionID: ${JSON.stringify(doc.sectionId)}`);

    const isCanteenIdObj =
      typeof doc.canteenId === "object" && doc.canteenId.$oid;
    log(`CanteenID Correct? ${isCanteenIdObj ? "YES (ObjectId)" : "NO"}`);
  } else {
    log("No items found.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
