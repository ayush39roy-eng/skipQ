
import { PrismaClient } from '@prisma/client'

// OVERRIDE FOR PRODUCTION
process.env.DATABASE_URL = "mongodb+srv://skipq39_db_user:yMKv2QCdupZiUguA@skipq.xrkoye3.mongodb.net/skipq?retryWrites=true&w=majority&appName=SKIPQ"

const prisma = new PrismaClient()

async function main() {
  console.log('Shifting recent orders back by 14 days...')

  // Target: Orders from the last week (Jan 9 - Jan 16)
  const startDate = new Date('2026-01-09T00:00:00Z')
  const endDate = new Date('2026-01-16T23:59:59Z')

  // Find IDs first
  const orders = await prisma.order.findMany({
    where: {
      source: 'SEED', // Safety: Only move fake data
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: { id: true, createdAt: true }
  })

  console.log(`Found ${orders.length} orders to shift.`)

  if (orders.length === 0) return

  // Update Loop
  let moved = 0
  for (const order of orders) {
      // Calculate new date (14 days ago)
      const newDate = new Date(order.createdAt.getTime() - (14 * 24 * 60 * 60 * 1000))

      await prisma.$transaction([
          // 1. Update Order
          prisma.order.update({
              where: { id: order.id },
              data: { 
                  createdAt: newDate,
                  updatedAt: newDate
              }
          }),
          // 2. Update Payment (if exists)
          prisma.payment.updateMany({
              where: { orderId: order.id },
              data: { paidAt: newDate }
          }),
          // 3. Update LedgerEntry (if exists)
          prisma.ledgerEntry.updateMany({
              where: { orderId: order.id },
              data: { timestamp: newDate }
          })
      ])
      
      moved++
      if (moved % 10 === 0) process.stdout.write('.')
  }

  console.log(`\nSuccessfully moved ${moved} orders back by 14 days.`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
