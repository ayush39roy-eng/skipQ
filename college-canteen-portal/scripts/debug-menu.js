const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Checking Vendors and Canteens...");

  const vendors = await prisma.vendor.findMany({
    include: {
      canteens: {
        include: {
          menuItems: true,
        },
      },
    },
  });

  for (const vendor of vendors) {
    console.log(`Vendor: ${vendor.name} (${vendor.id})`);
    for (const canteen of vendor.canteens) {
      console.log(`  Canteen: ${canteen.name} (${canteen.id})`);
      console.log(`  Menu Items Count: ${canteen.menuItems.length}`);
      if (canteen.menuItems.length > 0) {
        console.log(
          `    Sample Item: ${canteen.menuItems[0].name} (Available: ${canteen.menuItems[0].available})`
        );
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
