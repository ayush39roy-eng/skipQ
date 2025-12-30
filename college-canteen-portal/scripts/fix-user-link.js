const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1. Find the vendor with items (Geo Vendor)
  // We look for a vendor that HAS canteens which HAVE items
  const vendors = await prisma.vendor.findMany({
    include: {
      canteens: {
        include: { menuItems: { take: 1 } },
      },
    },
  });

  const targetVendor = vendors.find((v) =>
    v.canteens.some((c) => c.menuItems.length > 0)
  );

  if (!targetVendor) {
    console.log("CRITICAL: No vendor found with menu items!");
    return;
  }

  console.log(`Target Vendor Found: ${targetVendor.name} (${targetVendor.id})`);

  // 2. Find the user
  const email = "vendor@college.local";
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.log(`User ${email} not found!`);
    return;
  }

  console.log(`User ${email} currently linked to: ${user.vendorId}`);

  if (user.vendorId === targetVendor.id) {
    console.log(
      "User is already linked to the correct vendor. The issue is something else."
    );
  } else {
    console.log("re-linking user...");
    await prisma.user.update({
      where: { email },
      data: { vendorId: targetVendor.id },
    });
    console.log("SUCCESS: User re-linked.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
