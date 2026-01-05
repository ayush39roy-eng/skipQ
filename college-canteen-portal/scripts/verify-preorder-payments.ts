/**
 * Verify Pre-Order Payments
 * 
 * Checks if PRE_ORDERs are actually paid (Status: SUCCESS).
 * If they are paid but missing from Ledger, it confirms a bug in OrderService.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Checking PRE_ORDER Payments ===')

  // 1. Total Pre-Orders
  const totalPreOrders = await prisma.order.count({
    where: { orderType: 'PRE_ORDER' }
  })
  console.log(`Total Pre-Orders: ${totalPreOrders}`)

  // 2. Pre-Orders with Successful Payment
  // Checking both Order Status (ACCEPTED) and Payment Status (SUCCESS)
  const paidPreOrders = await prisma.order.findMany({
    where: {
        orderType: 'PRE_ORDER',
        OR: [
            { status: 'ACCEPTED' },
            { status: 'PAID' }, // Legacy status
            { payment: { status: 'SUCCESS' } }
        ]
    },
    include: { payment: true, ledgerEntries: true } // Check if any have ledger entries
  })
  
  console.log(`Paid/Accepted Pre-Orders: ${paidPreOrders.length}`)

  // 3. Check for Missing Ledger Entries
  const missingLedger = paidPreOrders.filter(o => o.ledgerEntries.length === 0)
  console.log(`Pre-Orders MISSING Ledger Entries: ${missingLedger.length}`)

  if (missingLedger.length > 0) {
      console.log('\nSample Missing Order:')
      console.log(JSON.stringify(missingLedger[0], null, 2))
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
