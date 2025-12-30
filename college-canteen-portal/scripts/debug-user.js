const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = "vendor@college.local";
  console.log(`Checking user: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { vendor: true },
  });

  if (!user) {
    console.log("User not found");
    return;
  }

  console.log(`User VendorID: ${user.vendorId}`);
  console.log(`Vendor Relation: ${user.vendor ? "FOUND" : "NULL"}`);
  if (user.vendor) console.log(`Vendor Name: ${user.vendor.name}`);
}

main().finally(() => prisma.$disconnect());
