const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const vendors = await prisma.vendor.findMany({
    include: {
      canteens: {
        include: { _count: { select: { menuItems: true } } },
      },
    },
  });

  console.log("--- SYSTEM DUMP ---");
  for (const v of vendors) {
    console.log(`[VENDOR] ${v.name} (ID: ${v.id})`);
    if (v.canteens.length === 0) {
      console.log("  (No Canteens)");
    } else {
      for (const c of v.canteens) {
        console.log(
          `  [CANTEEN] "${c.name}" (ID: ${c.id}) => ${c._count.menuItems} Items`
        );
      }
    }
    console.log("");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
