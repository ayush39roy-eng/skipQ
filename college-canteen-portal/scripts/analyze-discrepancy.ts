/**
 * Analyze Data Discrepancy
 * 
 * Breaks down Order counts by Type and Status, and compares with Ledger counts.
 * Helps explain why Reports (Ledger-based) differ from Vendor Dashboard (Order-based).
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Logic Discrepancy Analysis ===')

  // 1. Total Orders on Vendor Page (likely simple count)
  const totalOrders = await prisma.order.count()
  console.log(`\nTotal Orders (Vendor Dashboard): ${totalOrders}`)

  // 2. Breakdown by Order Type
  const byType = await prisma.order.groupBy({
    by: ['orderType'],
    _count: { id: true }
  })
  console.log('\nOrders by Type:')
  byType.forEach(g => console.log(`- ${g.orderType}: ${g._count.id}`))

  // 3. Breakdown by Status
  const byStatus = await prisma.order.groupBy({
    by: ['status'],
    _count: { id: true }
  })
  console.log('\nOrders by Status:')
  byStatus.forEach(g => console.log(`- ${g.status}: ${g._count.id}`))

  // 4. Financial Report Source (Ledger Entries)
  // Revenue Report uses: where type IN ['SALE', 'REFUND']
  const ledgerCount = await prisma.ledgerEntry.count({
    where: {
      type: { in: ['SALE', 'REFUND'] }
    }
  })
  console.log(`\nLeger Entries (Revenue Report Source): ${ledgerCount}`)

  // 5. Explicit Check: SELF_ORDER vs PRE_ORDER in Ledger
  const ledgerByType = await prisma.ledgerEntry.groupBy({
    by: ['orderType'],
    _count: { id: true }
  })
  console.log('\nLedger Entries by OrderType:')
  ledgerByType.forEach(g => console.log(`- ${g.orderType || 'NULL'}: ${g._count.id}`))

}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
