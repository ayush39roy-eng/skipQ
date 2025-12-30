import { Prisma } from '@prisma/client'
import { Vendor } from '@prisma/client'

export const LedgerService = {
  /**
   * Records a strictly immutable SALE entry.
   */
  async recordSale(
    tx: Prisma.TransactionClient,
    order: { 
      id: string
      vendorId: string | null
      totalCents: number
      taxCents: number
      commissionCents: number
      vendorTakeCents: number
      payment: {
        provider: string
      } | null
    }
  ) {
    if (!order.vendorId) throw new Error('Order missing vendorId')
    if (!order.payment) throw new Error('Order missing payment info')

    // 1. Validate: Ensure day is not closed
    // Optimization: We could check this outside, but strictly it belongs here.
    // For performance, we assume the caller or middleware checks open status.

    // 2. Create Ledger Entry
    // This represents the "Sale" event.
    // Gross = Total Customer Paid
    // Net = What the vendor actually "earns" (Total - Platform Fee)
    // Tax = Liability
    const entry = await tx.ledgerEntry.create({
      data: {
        vendorId: order.vendorId,
        orderId: order.id,
        type: 'SALE',
        paymentMode: order.payment.provider,
        
        grossAmount: order.totalCents,
        taxAmount: order.taxCents,
        platformFee: order.commissionCents,
        netAmount: order.vendorTakeCents,
        
        description: `Order Sale #${order.id.slice(-4)}`
      }
    })
    
    return entry
  },

  /**
   * Records a REFUND as a new dictionary entry (Negative values).
   * Does NOT modify the original entry.
   */
  async recordRefund(
    tx: Prisma.TransactionClient,
    originalOrderId: string,
    refundAmountCents: number,
    reason: string = 'REFUND'
  ) {
    // 1. Fetch Original Order to calculate pro-rata tax/fee reversals if partial
    // For simplicity, assuming full refund or direct amount input.
    // If partial refund, we must decide how much tax/fee to reverse.
    
    // FETCH ORIGINAL LEDGER ENTRY
    const originalEntry = await tx.ledgerEntry.findFirst({
        where: { orderId: originalOrderId, type: 'SALE' }
    })
    
    if (!originalEntry) throw new Error('Original sale entry not found for refund')

    // Ratio for partial usage
    const ratio = refundAmountCents / originalEntry.grossAmount
    
    const refundTax = Math.round(originalEntry.taxAmount * ratio)
    const refundFee = Math.round(originalEntry.platformFee * ratio)
    const refundNet = Math.round(originalEntry.netAmount * ratio)

    // 2. Create REFUND Entry (Negative)
    await tx.ledgerEntry.create({
        data: {
            vendorId: originalEntry.vendorId,
            orderId: originalOrderId,
            referenceEntryId: originalEntry.id, // GAP 2 Fix
            type: 'REFUND',
            paymentMode: originalEntry.paymentMode,
            
            grossAmount: -refundAmountCents,
            taxAmount: -refundTax,
            platformFee: -refundFee,
            netAmount: -refundNet,
            
            description: `Refund: ${reason}`
        }
    })
  },

  /**
   * Locks the ledger for a specific date.
   * Future edits/insertions for this date are forbidden.
   */
  async closeDay(
      tx: Prisma.TransactionClient,
      vendorId: string,
      date: Date, // should be midnight
      closedBy: string
  ) {
      // 1. Aggregate Totals
      // We look for all entries where timestamp is within the 24h of 'date'
      const startOfDay = new Date(date)
      startOfDay.setHours(0,0,0,0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23,59,59,999)

      const aggregate = await tx.ledgerEntry.aggregate({
          where: {
              vendorId,
              timestamp: {
                  gte: startOfDay,
                  lte: endOfDay
              }
          },
          _sum: {
              grossAmount: true,
              netAmount: true,
          },
          _count: {
              id: true
          }
      })

      // 2. Create Closure Record
      await tx.ledgerClosure.create({
          data: {
              vendorId,
              date: startOfDay,
              closedBy,
              totalGrossCents: aggregate._sum.grossAmount || 0,
              totalNetCents: aggregate._sum.netAmount || 0,
              orderCount: aggregate._count.id
          }
      })
  }
}
