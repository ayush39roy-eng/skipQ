const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Checking Prisma Models...");
  const models = ["ledgerEntry", "adminActionLog", "vendor"];

  for (const m of models) {
    if (prisma[m]) {
      console.log(`✅ prisma.${m} exists`);
    } else {
      console.log(`❌ prisma.${m} MISSING`);
    }
  }
}

main().finally(() => prisma.$disconnect());
