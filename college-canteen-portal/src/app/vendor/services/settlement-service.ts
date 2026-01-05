import { Prisma } from '@prisma/client'

/**
 * Settlement Service
 * 
 * Handles generation of settlement batches for vendor payouts.
 * Settlement batches group unsettled ledger entries for a specific time period.
 */
export const SettlementService = {
  /**
   * Generate a settlement batch for a vendor
   * 
   * Process:
   * 1. Fetch all unsettled ledger entries in date range
   * 2. Calculate totals (food, tax, platform fee, vendor payable)
   * 3. Create SettlementBatch record
   * 4. Mark all included entries as SETTLED
   * 
   * All operations done in a single transaction for atomicity.
   * 
   * @param tx Prisma transaction client
   * @param params Settlement generation parameters
   * @returns Created settlement batch with ledger entries
   */
  async generateSettlement(
    tx: Prisma.TransactionClient,
    params: {
      vendorId: string
      periodStartDate: Date
      periodEndDate: Date
      createdByUserId?: string
    }
  ) {
    const { vendorId, periodStartDate, periodEndDate, createdByUserId } = params

    // 1. Fetch all UNSETTLED ledger entries in date range
    const unsettledEntries = await tx.ledgerEntry.findMany({
      where: {
        vendorId,
        settlementStatus: 'UNSETTLED',
        timestamp: {
          gte: periodStartDate,
          lte: periodEndDate
        }
      },
      include: {
        order: {
          select: {
            id: true
          }
        }
      }
    })

    if (unsettledEntries.length === 0) {
      throw new Error('No unsettled entries found in the specified date range')
    }

    // 2. Calculate totals
    let totalFoodAmount = 0
    let totalTaxAmount = 0
    let totalPlatformFee = 0
    let totalVendorPayable = 0
    const uniqueOrderIds = new Set<string>()

    for (const entry of unsettledEntries) {
      // Food amount = gross - tax - platformFee
      const foodAmount = entry.grossAmount - entry.taxAmount - entry.platformFee
      
      totalFoodAmount += foodAmount
      totalTaxAmount += entry.taxAmount
      totalPlatformFee += entry.platformFee
      totalVendorPayable += entry.netAmount
      
      if (entry.orderId) {
        uniqueOrderIds.add(entry.orderId)
      }
    }

    const totalOrders = uniqueOrderIds.size

    console.log('[SETTLEMENT] Batch calculation:', {
      vendorId,
      periodStart: periodStartDate,
      periodEnd: periodEndDate,
      entriesCount: unsettledEntries.length,
      totalFoodAmount,
      totalTaxAmount,
      totalPlatformFee,
      totalVendorPayable,
      totalOrders
    })

    // 3. Create SettlementBatch (immutable after creation)
    const settlementBatch = await tx.settlementBatch.create({
      data: {
        vendorId,
        periodStartDate,
        periodEndDate,
        totalFoodAmount,
        totalTaxAmount,
        totalPlatformFee,
        totalVendorPayable,
        totalOrders,
        createdByUserId,
        status: 'CREATED'
      }
    })

    // 4. Mark all included ledger entries as SETTLED
    await tx.ledgerEntry.updateMany({
      where: {
        id: { in: unsettledEntries.map(e => e.id) }
      },
      data: {
        settlementStatus: 'SETTLED',
        settlementBatchId: settlementBatch.id
      }
    })

    console.log('[SETTLEMENT] Batch created:', {
      batchId: settlementBatch.id,
      entriesSettled: unsettledEntries.length
    })

    return {
      settlementBatch,
      settledEntriesCount: unsettledEntries.length
    }
  },

  /**
   * Check if a date range overlaps with existing settlement batches
   * 
   * @param tx Prisma transaction client
   * @param vendorId Vendor ID
   * @param startDate Period start date
   * @param endDate Period end date
   * @returns true if overlaps, false otherwise
   */
  async hasOverlappingSettlement(
    tx: Prisma.TransactionClient,
    vendorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const overlapping = await tx.settlementBatch.findFirst({
      where: {
        vendorId,
        OR: [
          // New period starts during existing period
          {
            periodStartDate: { lte: startDate },
            periodEndDate: { gte: startDate }
          },
          // New period ends during existing period
          {
            periodStartDate: { lte: endDate },
            periodEndDate: { gte: endDate }
          },
          // New period completely contains existing period
          {
            periodStartDate: { gte: startDate },
            periodEndDate: { lte: endDate }
          }
        ]
      }
    })

    return overlapping !== null
  },

  /**
   * Mark a settlement batch as exported
   * 
   * @param tx Prisma transaction client
   * @param settlementBatchId Settlement batch ID
   */
  async markAsExported(
    tx: Prisma.TransactionClient,
    settlementBatchId: string
  ) {
    await tx.settlementBatch.update({
      where: { id: settlementBatchId },
      data: {
        status: 'EXPORTED',
        exportedAt: new Date()
      }
    })
  }
}
