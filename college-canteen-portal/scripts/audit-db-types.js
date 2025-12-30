const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const fs = require("fs");
const util = require("util");
const logFile = fs.createWriteStream("scripts/audit.log", { flags: "w" });
const log = function (d) {
  logFile.write(util.format(d) + "\n");
  process.stdout.write(util.format(d) + "\n");
};

const COLLECTIONS = [
  { name: "User", fields: ["vendorId", "customerId"] },
  { name: "Canteen", fields: ["vendorId"] },
  { name: "MenuSection", fields: ["canteenId"] },
  { name: "MenuItem", fields: ["canteenId", "sectionId"] },
  { name: "Order", fields: ["userId", "canteenId", "vendorId", "staffId"] },
  { name: "InventoryItem", fields: ["vendorId"] },
  { name: "Staff", fields: ["vendorId"] },
  { name: "Shift", fields: ["staffId", "canteenId"] },
  { name: "LedgerEntry", fields: ["vendorId", "orderId"] },
  { name: "AiInsights", fields: ["vendorId"] },
];

async function getType(val) {
  if (val === null || val === undefined) return "null";
  if (typeof val === "string") return "string";
  if (typeof val === "object") {
    if (val.$oid) return "ObjectId"; // Raw BSON
    if (val.toString().match(/^[0-9a-fA-F]{24}$/)) return "ObjectId-Like";
    return "object";
  }
  return typeof val;
}

async function main() {
  console.log("--- STARTING TYPE AUDIT ---");

  for (const col of COLLECTIONS) {
    process.stdout.write(`Checking ${col.name}... `);
    try {
      const res = await prisma.$runCommandRaw({
        find: col.name,
        limit: 5, // Check first 5 items
      });

      if (
        !res.cursor ||
        !res.cursor.firstBatch ||
        res.cursor.firstBatch.length === 0
      ) {
        log("EMPTY");
        continue;
      }

      log(`(${res.cursor.firstBatch.length} samples)`);

      const docs = res.cursor.firstBatch;

      for (const field of col.fields) {
        const types = new Set();
        docs.forEach((d) => {
          let val = d[field];
          // Handle potential nested casing if needed, but Prisma Raw usually keeps DB case
          // MongoDB is case sensitive? Keys are usually camelCase in this app.
          types.add(getType(val));
        });

        // Resolve promise types
        const resolvedTypes = [];
        for (const t of types) resolvedTypes.push(await t);

        const isBad = resolvedTypes.includes("string"); // Strings are BAD for IDs
        const status = isBad ? "NEEDS MIGRATION" : "OK";
        const color = isBad ? "\x1b[31m" : "\x1b[32m";
        const reset = "\x1b[0m";

        console.log(
          `  - ${field}: ${color}${status}${reset} [${resolvedTypes.join(
            ", "
          )}]`
        );
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
