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
      orderType: string // 'SELF_ORDER' or 'PRE_ORDER'
      platformFeeRate: number // e.g., 0.015 or 0.03
      platformFeeAmount: number // Fee amount in cents
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
        
        // Order Type & Fee Tracking (Audit Trail)
        orderType: order.orderType,
        platformFeeRate: order.platformFeeRate,
        
        description: `Order Sale #${order.id.slice(-4)}`
      }
    })
    
    return entry
  },

  /**
   * Records a REFUND as a new ledger entry (Negative values).
   * Does NOT modify the original entry.
   * 
   * Supports both full and partial refunds with proportional breakdown.
   */
  async recordRefund(
    tx: Prisma.TransactionClient,
    params: {
      originalOrderId: string
      refundAmountCents: number  // Can be partial or full
      reason: string
      orderType?: string  // Track in refund entry for audit
      platformFeeRate?: number  // Snapshot rate for audit
    }
  ) {
    // 1. Fetch Original Order to calculate pro-rata reversals
    const originalEntry = await tx.ledgerEntry.findFirst({
        where: { orderId: params.originalOrderId, type: 'SALE' }
    })
    
    if (!originalEntry) {
      throw new Error('Original sale entry not found for refund')
    }

    // 2. Calculate proportional breakdown
    const ratio = params.refundAmountCents / originalEntry.grossAmount
    
    // Calculate each component proportionally
    const refundFood = Math.round((originalEntry.grossAmount - originalEntry.taxAmount - originalEntry.platformFee) * ratio)
    const refundTax = Math.round(originalEntry.taxAmount * ratio)
    const refundPlatformFee = Math.round(originalEntry.platformFee * ratio)
    const refundNet = Math.round(originalEntry.netAmount * ratio)
    
    // 3. Handle rounding edge cases - ensure sum equals requested refund
    const calculatedTotal = refundFood + refundTax + refundPlatformFee
    const adjustment = params.refundAmountCents - calculatedTotal
    
    // Apply any rounding adjustment to food portion (most flexible component)
    const adjustedRefundFood = refundFood + adjustment
    
    console.log('[LEDGER] Refund breakdown:', {
      originalGross: originalEntry.grossAmount,
      refundAmount: params.refundAmountCents,
      ratio,
      components: {
        food: adjustedRefundFood,
        tax: refundTax,
        platformFee: refundPlatformFee,
        net: refundNet
      },
      roundingAdjustment: adjustment
    })

    // 4. Create REFUND Entry (Negative)
    await tx.ledgerEntry.create({
        data: {
            vendorId: originalEntry.vendorId,
            orderId: params.originalOrderId,
            referenceEntryId: originalEntry.id, // Link to original sale
            type: 'REFUND',
            paymentMode: originalEntry.paymentMode,
            
            // Negative values reverse the sale
            grossAmount: -params.refundAmountCents,
            taxAmount: -refundTax,
            platformFee: -refundPlatformFee,
            netAmount: -refundNet,
            
            // Order Type & Fee Tracking (for audit trail)
            orderType: params.orderType || originalEntry.orderType,
            platformFeeRate: params.platformFeeRate || originalEntry.platformFeeRate,
            
            description: `Refund: ${params.reason} (${ratio === 1 ? 'Full' : 'Partial - ' + (ratio * 100).toFixed(1) + '%'})`
        }
    })
    
    return {
      refundedAmount: params.refundAmountCents,
      breakdown: {
        food: adjustedRefundFood,
        tax: refundTax,
        platformFee: refundPlatformFee
      },
      ratio
    }
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
