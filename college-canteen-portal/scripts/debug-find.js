const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const vendorId = "693807b19a09c4ca3fde3deb"; // spice garden
  console.log(`Checking canteens for vendor: ${vendorId}`);

  const canteens = await prisma.canteen.findMany({
    where: { vendorId: vendorId },
    include: { vendor: true },
  });

  console.log(`Found: ${canteens.length}`);
  console.log(canteens);
}

main().finally(() => prisma.$disconnect());
