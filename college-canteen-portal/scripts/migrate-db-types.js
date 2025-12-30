const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// DRY RUN by default for safety
const DRY_RUN = false;

const MIGRATIONS = [
  { collection: "InventoryItem", fields: ["vendorId"] },
  { collection: "User", fields: ["vendorId", "customerId"] },
  { collection: "Canteen", fields: ["vendorId"] },
  { collection: "MenuSection", fields: ["canteenId"] },
  { collection: "MenuItem", fields: ["canteenId", "sectionId"] },
  {
    collection: "Order",
    fields: ["userId", "canteenId", "vendorId", "staffId"],
  },
];

async function migrateCollection(name, fields) {
  console.log(`\n--- Migrating ${name} ---`);

  // Filter only documents where at least one target field is a string
  const filter = {
    $or: fields.map((f) => ({ [f]: { $type: "string" } })),
  };

  // 1. Fetch all docs (using raw to see real types)
  const res = await prisma.$runCommandRaw({
    find: name,
    filter: filter,
  });

  if (!res.cursor || !res.cursor.firstBatch) return;

  let updates = 0;
  let skipped = 0;
  const batch = res.cursor.firstBatch;

  for (const doc of batch) {
    const updateData = {};
    let needsUpdate = false;

    for (const field of fields) {
      const val = doc[field];

      // Check if String AND Valid Hex (24 chars)
      if (typeof val === "string" && val.match(/^[0-9a-fA-F]{24}$/)) {
        // It is a String, needs to be ObjectId
        updateData[field] = { $oid: val };
        needsUpdate = true;
      } else {
        // Already ObjectId, Null, or Invalid
      }
    }

    if (needsUpdate) {
      if (!DRY_RUN) {
        // Perform Update
        await prisma.$runCommandRaw({
          update: name,
          updates: [
            {
              q: { _id: { $oid: doc._id.$oid } },
              u: { $set: updateData },
            },
          ],
        });
        process.stdout.write(".");
      } else {
        console.log(
          `[DRY] Would update ${doc._id.$oid}:`,
          JSON.stringify(updateData)
        );
      }
      updates++;
    } else {
      skipped++;
    }
  }

  console.log(
    `\nProcessed ${batch.length}. Updates: ${updates}. Skipped: ${skipped}`
  );
}

async function main() {
  console.log(`STARTING MIGRATION (DRY_RUN: ${DRY_RUN})`);

  for (const m of MIGRATIONS) {
    await migrateCollection(m.collection, m.fields);
  }

  console.log("\nDone.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
