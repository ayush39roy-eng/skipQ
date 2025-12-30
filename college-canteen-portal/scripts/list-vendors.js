const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");

async function main() {
  const vendors = await prisma.vendor.findMany({
    select: { id: true, name: true, mode: true },
  });
  let out = "ID | Name | Mode\n";
  vendors.forEach((v) => {
    out += `${v.id} | ${v.name} | ${v.mode}\n`;
  });
  fs.writeFileSync("scripts/vendors.txt", out);
  console.log("done");
}

main().finally(() => prisma.$disconnect());
