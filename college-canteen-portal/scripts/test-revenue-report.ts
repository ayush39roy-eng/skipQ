
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Testing Revenue Report Generation (Direct Logic)...')
  
  const start = new Date('2024-01-01')
  const end = new Date('2030-12-31')

  try {
    // 1. Fetch Ledger Entries directly
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        timestamp: {
          gte: start,
          lte: end
        },
        type: { in: ['SALE', 'REFUND'] }
      },
      select: {
        platformFee: true,
        orderId: true
      }
    })

    console.log(`Found ${entries.length} ledger entries.`)

    if (entries.length === 0) {
      console.log('No entries found. Returning default zero report.')
    }

    // 2. Calculate Stats
    const grossPlatformFees = entries.reduce((sum, e) => sum + e.platformFee, 0)
    const platformGSTCollected = Math.round(grossPlatformFees * 0.18)
    const netPlatformRevenue = grossPlatformFees - platformGSTCollected
    
    const uniqueOrderIds = new Set(entries.filter(e => e.orderId).map(e => e.orderId))
    const ordersCount = uniqueOrderIds.size
    
    const averageFeePerOrder = ordersCount > 0 
      ? Math.round(grossPlatformFees / ordersCount) 
      : 0

    const report = {
      grossPlatformFees,
      platformGSTCollected,
      netPlatformRevenue,
      ordersCount,
      averageFeePerOrder
    }
    
    console.log('Report generated successfully:')
    console.log(JSON.stringify(report, null, 2))

  } catch (error) {
    console.error('Error generating report:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
