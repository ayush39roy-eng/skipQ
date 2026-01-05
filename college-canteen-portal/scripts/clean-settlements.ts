/**
 * Clean Settlement Data
 * 
 * Resets all Ledger Entries to UNSETTLED and deletes all Settlement Batches.
 * Allows for clean regeneration of settlements after stress testing / backfilling.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Cleaning Settlement Data ===')

  // 1. Reset Ledger Entries
  const updated = await prisma.ledgerEntry.updateMany({
    where: {
      settlementStatus: 'SETTLED'
    },
    data: {
      settlementStatus: 'UNSETTLED',
      settlementBatchId: null
    }
  })
  console.log(`Reset ${updated.count} ledger entries to UNSETTLED.`)

  // 2. Delete Settlement Batches
  const deleted = await prisma.settlementBatch.deleteMany({})
  console.log(`Deleted ${deleted.count} settlement batches.`)

  console.log('\n✅ System ready for new settlement generation.')
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
