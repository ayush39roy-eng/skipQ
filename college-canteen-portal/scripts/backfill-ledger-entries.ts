/**
 * Backfill Ledger Entries for Existing Paid Orders
 * 
 * This script creates ledger entries for all paid orders that don't have them yet.
 * Run this once to fix historical data.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillLedgerEntries() {
  console.log('Starting ledger entry backfill...')

  // Find all PAID orders without ledger entries
  const paidOrders = await prisma.order.findMany({
    where: {
      OR: [
        { status: 'PAID' },
        { status: 'ACCEPTED' },
        { payment: { status: 'SUCCESS' } }
      ],
      ledgerEntries: {
        none: {}
      }
    },
    include: {
      payment: true
    }
  })

  console.log(`Found ${paidOrders.length} paid orders without ledger entries`)

  let created = 0
  let errors = 0

  for (const order of paidOrders) {
    try {
      if (!order.vendorId) {
        console.log(`Skipping order ${order.id} - no vendorId`)
        continue
      }

      await prisma.ledgerEntry.create({
        data: {
          vendorId: order.vendorId,
          orderId: order.id,
          type: 'SALE',
          paymentMode: order.payment?.provider || 'razorpay',
          grossAmount: order.totalCents,
          taxAmount: order.taxCents,
          platformFee: order.commissionCents,
          netAmount: order.vendorTakeCents,
          orderType: order.orderType || 'SELF_ORDER',
          platformFeeRate: order.platformFeeRate || 0.015,
          settlementStatus: 'UNSETTLED',
          timestamp: order.createdAt
        }
      })

      created++
      console.log(`✓ Created ledger entry for order ${order.id.substring(0, 8)}`)
    } catch (error) {
      errors++
      console.error(`✗ Failed to create ledger entry for order ${order.id}:`, error)
    }
  }

  console.log('\n=== Backfill Complete ===')
  console.log(`Created: ${created}`)
  console.log(`Errors: ${errors}`)
  console.log(`Total orders processed: ${paidOrders.length}`)

  await prisma.$disconnect()
}

backfillLedgerEntries()
  .catch((error) => {
    console.error('Backfill failed:', error)
    process.exit(1)
  })
