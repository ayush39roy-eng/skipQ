const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const canteenId = "6922c0bdaddeed30663371ef";
  const vendorId1 = "691ee20fda41c696149ae1c7";
  const vendorId2 = "6922c096addeed30663371ed";

  console.log("--- CANTEEN ---");
  const c = await prisma.canteen.findUnique({
    where: { id: canteenId },
    include: { vendor: true },
  });
  if (c) {
    console.log(`ID: ${c.id}`);
    console.log(`Name: ${c.name}`);
    console.log(`VendorID: ${c.vendorId}`);
    console.log(`VendorName: ${c.vendor.name}`);
  } else {
    console.log("Canteen not found");
  }

  console.log("\n--- VENDOR 1 (...1c7) ---");
  const v1 = await prisma.vendor.findUnique({ where: { id: vendorId1 } });
  console.log(v1);

  console.log("\n--- VENDOR 2 (...1ed) ---");
  const v2 = await prisma.vendor.findUnique({ where: { id: vendorId2 } });
  console.log(v2);
}

main().finally(() => prisma.$disconnect());
