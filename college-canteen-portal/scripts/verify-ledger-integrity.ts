/**
 * Verify Ledger Integrity
 * 
 * Checks if the number of ledger entries matches the number of eligible orders.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Verifying Ledger Integrity ===')

  // 1. Count Total Orders
  const totalOrders = await prisma.order.count()
  
  // 2. Count Eligible Orders (SELF_ORDER + ACCEPTED/PAID)
  // Logic from OrderService: only SELF_ORDER and valid status triggers ledger
  const eligibleOrders = await prisma.order.count({
    where: {
      orderType: 'SELF_ORDER',
      status: { in: ['ACCEPTED', 'PAID', 'COMPLETED'] }
    }
  })

  // 3. Count Ledger Entries (Type: SALE)
  const ledgerEntries = await prisma.ledgerEntry.count({
    where: {
      type: 'SALE'
    }
  })

  console.log(`Total Orders: ${totalOrders}`)
  console.log(`Eligible for Ledger: ${eligibleOrders}`)
  console.log(`Actual Ledger Entries: ${ledgerEntries}`)

  if (eligibleOrders === ledgerEntries) {
    console.log('\n✅ PASS: Ledger entries match eligible orders.')
  } else {
    console.log(`\n❌ FAIL: Mismatch! Diff: ${eligibleOrders - ledgerEntries}`)
    
    // Debug info
    if (eligibleOrders > ledgerEntries) {
        console.log('Some orders are missing ledger entries.')
    } else {
        console.log('Found orphaned ledger entries (more entries than orders).')
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
