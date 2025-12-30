const { PrismaClient } = require("@prisma/client");

// Construct URL for 'skipq' database
const currentUrl = process.env.DATABASE_URL;
const otherDbUrl = currentUrl.replace("/canteen?", "/skipq?");

console.log(`Checking DB: .../${otherDbUrl.split("/").pop().split("?")[0]}`);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: otherDbUrl,
    },
  },
});

async function main() {
  try {
    const vendor = await prisma.vendor.findFirst();
    if (vendor) {
      console.log(`Found Vendor: ${vendor.name} (${vendor.id})`);
      // Dump all canteens
      const allCanteens = await prisma.canteen.findMany();
      console.log(`\nAll Canteens (${allCanteens.length}):`);
      allCanteens.forEach((c) =>
        console.log(`- ${c.name} (VendorID: ${c.vendorId})`)
      );
      // Test related canteen
      const canteen = await prisma.canteen.findFirst({
        where: { vendorId: vendor.id },
      });
      console.log(`Related Canteen: ${canteen ? canteen.name : "NONE"}`);
    }

    const count = await prisma.menuItem.count();
    console.log(`Menu Items in 'skipq': ${count}`);

    const orders = await prisma.order.count();
    console.log(`Orders in 'skipq': ${orders}`);

    // Check one item to see if it needs migration
    if (count > 0) {
      const item = await prisma.$runCommandRaw({
        find: "MenuItem",
        limit: 1,
      });
      if (item.cursor?.firstBatch?.[0]) {
        const doc = item.cursor.firstBatch[0];
        console.log("Sample Item CanteenID Type:", typeof doc.canteenId);
        // Determine if migration is needed
        if (
          typeof doc.canteenId === "string" &&
          !doc.canteenId.match(/^\d+$/)
        ) {
          // If string and looks like hex (basic check)
          console.log("STATUS: NEEDS MIGRATION");
        } else {
          console.log("STATUS: OK (or unknown format)");
        }
      }
    }
  } catch (e) {
    console.log(`Error connecting to skipq: ${e.message}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
