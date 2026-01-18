
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// OVERRIDE FOR PRODUCTION VERIFICATION
process.env.DATABASE_URL = "mongodb+srv://skipq39_db_user:yMKv2QCdupZiUguA@skipq.xrkoye3.mongodb.net/skipq?retryWrites=true&w=majority&appName=SKIPQ"

async function main() {
  // 1. Check DB Connection (Masking credentials)
  const dbUrl = process.env.DATABASE_URL || 'UNDEFINED'
  const maskedUrl = dbUrl.replace(/\/\/.*@/, '//***:***@')
  console.log(`Connected to: ${maskedUrl}`)

  // 2. Check ALL Seed Orders
  const seedCount = await prisma.order.count({
    where: { source: 'SEED' }
  })
  console.log(`Total SEED Orders in DB: ${seedCount}`)

  // 3. Check Affected Vendors
  const orders = await prisma.order.findMany({
      where: { source: 'SEED' },
      select: { vendor: { select: { name: true } } },
      distinct: ['vendorId']
  })
  
  console.log('Vendors with fake data:')
  orders.forEach(o => console.log(` - ${o.vendor?.name}`))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
