const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const canteens = await prisma.canteen.findMany({
    select: {
      id: true,
      name: true,
      vendor: { select: { name: true } },
      _count: { select: { menuItems: true } },
    },
    orderBy: { name: "asc" },
  });

  const fs = require("fs");
  let output = "ID | Name | Vendor | Items\n";
  canteens.forEach((c) => {
    output += `${c.id} | ${c.name} | ${c.vendor.name} | ${c._count.menuItems}\n`;
  });
  fs.writeFileSync("scripts/canteens.txt", output);
  console.log("Output written to scripts/canteens.txt");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
