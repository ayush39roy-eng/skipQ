
import { PrismaClient } from '@prisma/client'

// OVERRIDE FOR PRODUCTION (Safety Check)
process.env.DATABASE_URL = "mongodb+srv://skipq39_db_user:yMKv2QCdupZiUguA@skipq.xrkoye3.mongodb.net/skipq?retryWrites=true&w=majority&appName=SKIPQ"

const prisma = new PrismaClient()

async function main() {
  console.log('Checking Order Counts...')

  // Range 1: User specified (2025)
  const start2025 = new Date('2025-01-09T00:00:00Z')
  const end2025 = new Date('2025-01-16T23:59:59Z')
  
  const count2025 = await prisma.order.count({
    where: {
      createdAt: {
        gte: start2025,
        lte: end2025
      }
    }
  })
  
  // Range 2: Likely Intent (2026 - Last Week)
  // Current time is 2026-01-16
  const start2026 = new Date('2026-01-09T00:00:00Z')
  const end2026 = new Date('2026-01-16T23:59:59Z')

  const count2026 = await prisma.order.count({
    where: {
      createdAt: {
        gte: start2026,
        lte: end2026
      }
    }
  })

  // Check Source "SEED" specifically in 2026
  const seedCount2026 = await prisma.order.count({
    where: {
        source: 'SEED',
        createdAt: {
            gte: start2026,
            lte: end2026
        }
    }
  })

  console.log(JSON.stringify({
    range2025: { start: start2025, end: end2025, count: count2025 },
    range2026: { start: start2026, end: end2026, count: count2026, seedCount: seedCount2026 }
  }, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
