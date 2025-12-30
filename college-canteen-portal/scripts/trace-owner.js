const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.menuItem.findFirst();
  if (!item) {
    console.log("No items.");
    return;
  }

  console.log(
    `Tracing owner of Item "${item.name}" (CanteenID: ${item.canteenId})...`
  );

  const canteen = await prisma.canteen.findUnique({
    where: { id: item.canteenId },
    include: { vendor: true },
  });

  if (!canteen) {
    console.log("Canteen not found!");
    return;
  }

  console.log(`Canteen: ${canteen.name} (ID: ${canteen.id})`);
  console.log(
    `Owner Vendor: ${canteen.vendor.name} (ID: ${canteen.vendor.id})`
  );

  const user = await prisma.user.findUnique({
    where: { email: "vendor@college.local" },
  });
  console.log(`Current User vendorId: ${user.vendorId}`);

  if (user.vendorId !== canteen.vendor.id) {
    console.log("MISMATCH DETECTED. Updating user...");
    await prisma.user.update({
      where: { email: "vendor@college.local" },
      data: { vendorId: canteen.vendor.id },
    });
    console.log("User linked to correct vendor.");
  } else {
    console.log("User is already linked to this vendor.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
