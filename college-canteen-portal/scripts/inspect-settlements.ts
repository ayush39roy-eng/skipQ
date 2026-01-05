/**
 * Inspect Settlement Data
 * 
 * Lists all SettlementBatches and counts Unsettled LedgerEntries for the main vendor.
 * Helps diagnose "Overlap" and "No entries" errors.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Settlement Data Inspection ===')

  // 1. Get Main Vendor
  const vendor = await prisma.vendor.findFirst()
  if (!vendor) throw new Error('No vendor found')
  // 2. List Existing Batches
  const batches = await prisma.settlementBatch.findMany({
    where: { vendorId: vendor.id },
    orderBy: { periodStartDate: 'asc' }
  })

  // 3. Count Unsettled Entries
  const unsettledCount = await prisma.ledgerEntry.count({
    where: {
        vendorId: vendor.id,
        settlementStatus: 'UNSETTLED',
        type: { in: ['SALE', 'REFUND'] }
    }
  })

  const output = []
  output.push('=== Settlement Data Inspection ===')
  output.push(`Vendor: ${vendor.name} (${vendor.id})`)
  output.push(`\nExisting Settlement Batches: ${batches.length}`)
  batches.forEach(b => {
      output.push(`- [${b.status}] ${b.periodStartDate.toISOString()} to ${b.periodEndDate.toISOString()} (Orders: ${b.totalOrders})`)
  })
  output.push(`\nUnsettled Ledger Entries: ${unsettledCount}`)
  
  if (unsettledCount > 0) {
      const firstEntry = await prisma.ledgerEntry.findFirst({
        where: { vendorId: vendor.id, settlementStatus: 'UNSETTLED' },
        orderBy: { timestamp: 'asc' }
      })
      const lastEntry = await prisma.ledgerEntry.findFirst({
        where: { vendorId: vendor.id, settlementStatus: 'UNSETTLED' },
        orderBy: { timestamp: 'desc' }
      })
      output.push(`Unsettled Range: ${firstEntry?.timestamp.toISOString()} to ${lastEntry?.timestamp.toISOString()}`)
  }
  
  const fs = require('fs')
  fs.writeFileSync('settlement_debug.txt', output.join('\n'))
  console.log('Written to settlement_debug.txt')
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
