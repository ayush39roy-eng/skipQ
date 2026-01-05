import { Prisma } from '@prisma/client'

/**
 * Financial Reporting Service
 * 
 * Company-level financial reports derived ONLY from immutable ledger data.
 * NO frontend calculations. NO recomputation.
 * 
 * Core Principle: LedgerEntry is the SINGLE source of financial truth.
 */

export type ReportFilters = {
  dateRange: {
    start: Date
    end: Date
  }
  vendorId?: string
  orderType?: string
  settlementStatus?: 'SETTLED' | 'UNSETTLED'
}

export type RevenueReport = {
  grossPlatformFees: number      // Sum of platformFee
  platformGSTCollected: number   // 18% of platform fees
  netPlatformRevenue: number     // Gross - GST
  ordersCount: number
  averageFeePerOrder: number
}

export type GSTLiabilityReport = {
  platformFeeGSTCollected: number
  gstPaid: number
  netGSTLiability: number
}

export type CashFlowReport = {
  cashIn: number                 // User payments (grossAmount)
  cashOut: number                 // Vendor settlements
  platformFeeRetained: number
  pendingLiabilities: number     // Unsettled vendor payables
  netCashFlow: number
}

export type VendorLiabilityReport = {
  totalUnsettledPayables: number
  settledAmount: number
  vendorBreakdown: Array<{
    vendorId: string
    vendorName: string
    unsettledAmount: number
    settledAmount: number
  }>
}

export type PnLReport = {
  revenue: number                // Net platform revenue
  costs: {
    paymentGateway: number       // Manual input
    infrastructure: number        // Manual input
    salaries: number             // Manual input
    marketing: number            // Manual input
    total: number
  }
  grossMargin: number
  netProfitLoss: number
}

export type ReconciliationReport = {
  assertions: {
    name: string
    expected: number
    actual: number
    passed: boolean
    difference: number
  }[]
  overallStatus: 'PASS' | 'FAIL'
  criticalFailures: string[]
}

export const FinancialReportingService = {
  /**
   * Build WHERE clause for ledger entry filters
   */
  buildWhereClause(filters: ReportFilters): Prisma.LedgerEntryWhereInput {
    const where: Prisma.LedgerEntryWhereInput = {
      timestamp: {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      }
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId
    }

    if (filters.orderType) {
      where.orderType = filters.orderType
    }

    if (filters.settlementStatus) {
      where.settlementStatus = filters.settlementStatus
    }

    return where
  },

  /**
   * Company Revenue Report
   * 
   * Platform earnings from fees.
   * Includes refunds (negative entries).
   */
  async generateRevenueReport(
    tx: Prisma.TransactionClient,
    filters: ReportFilters,
    gstRatePercentage: number = 18 // Default to 18% if not provided
  ): Promise<RevenueReport> {
    const where = this.buildWhereClause(filters)

    // Get all ledger entries (SALE and REFUND types)
    const entries = await tx.ledgerEntry.findMany({
      where: {
        ...where,
        type: { in: ['SALE', 'REFUND'] }
      },
      select: {
        platformFee: true,
        orderId: true
      }
    })

    // Calculate totals
    const grossPlatformFees = entries.reduce((sum, e) => sum + e.platformFee, 0)
    
    // Platform GST is calculated from the rate (e.g. 18%)
    const platformGSTCollected = Math.round(grossPlatformFees * (gstRatePercentage / 100))
    
    // Net revenue = gross fees - GST
    const netPlatformRevenue = grossPlatformFees - platformGSTCollected
    
    // Count unique orders
    const uniqueOrderIds = new Set(entries.filter(e => e.orderId).map(e => e.orderId))
    const ordersCount = uniqueOrderIds.size
    
    // Average fee per order
    const averageFeePerOrder = ordersCount > 0 
      ? Math.round(grossPlatformFees / ordersCount) 
      : 0

    return {
      grossPlatformFees,
      platformGSTCollected,
      netPlatformRevenue,
      ordersCount,
      averageFeePerOrder
    }
  },

  /**
   * GST Liability Report
   * 
   * Platform GST only. Excludes vendor food GST.
   * COMPLIANCE-CRITICAL.
   */
  async generateGSTLiabilityReport(
    tx: Prisma.TransactionClient,
    filters: ReportFilters,
    gstRatePercentage: number = 18
  ): Promise<GSTLiabilityReport> {
    const where = this.buildWhereClause(filters)

    const entries = await tx.ledgerEntry.findMany({
      where: {
        ...where,
        type: { in: ['SALE', 'REFUND'] }
      },
      select: {
        platformFee: true
      }
    })

    const totalPlatformFees = entries.reduce((sum, e) => sum + e.platformFee, 0)
    
    // Platform GST = rate * platform fees
    const platformFeeGSTCollected = Math.round(totalPlatformFees * (gstRatePercentage / 100))
    
    // TODO: Track actual GST payments (manual entry or payment records)
    const gstPaid = 0
    
    const netGSTLiability = platformFeeGSTCollected - gstPaid

    return {
      platformFeeGSTCollected,
      gstPaid,
      netGSTLiability
    }
  },

  /**
   * Cash Flow Report
   * 
   * Actual cash movement, not revenue.
   */
  async generateCashFlowReport(
    tx: Prisma.TransactionClient,
    filters: ReportFilters
  ): Promise<CashFlowReport> {
    const where = this.buildWhereClause(filters)

    const entries = await tx.ledgerEntry.findMany({
      where: {
        ...where,
        type: { in: ['SALE', 'REFUND'] }
      },
      select: {
        grossAmount: true,
        platformFee: true,
        netAmount: true,
        settlementStatus: true
      }
    })

    // Cash In = total user payments
    const cashIn = entries.reduce((sum, e) => sum + e.grossAmount, 0)
    
    // Platform fees retained
    const platformFeeRetained = entries.reduce((sum, e) => sum + e.platformFee, 0)
    
    // Pending liabilities = unsettled vendor payables
    const pendingLiabilities = entries
      .filter(e => e.settlementStatus === 'UNSETTLED')
      .reduce((sum, e) => sum + e.netAmount, 0)
    
    // Cash Out = settled vendor payables
    const cashOut = entries
      .filter(e => e.settlementStatus === 'SETTLED')
      .reduce((sum, e) => sum + e.netAmount, 0)
    
    const netCashFlow = cashIn - cashOut

    return {
      cashIn,
      cashOut,
      platformFeeRetained,
      pendingLiabilities,
      netCashFlow
    }
  },

  /**
   * Vendor Liability Report
   * 
   * Outstanding vendor payables.
   */
  async generateVendorLiabilityReport(
    tx: Prisma.TransactionClient,
    filters: ReportFilters
  ): Promise<VendorLiabilityReport> {
    const where = this.buildWhereClause(filters)

    const entries = await tx.ledgerEntry.findMany({
      where: {
        ...where,
        type: { in: ['SALE', 'REFUND'] }
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Group by vendor
    const vendorMap = new Map<string, {
      vendorId: string
      vendorName: string
      unsettled: number
      settled: number
    }>()

    for (const entry of entries) {
      const vendorId = entry.vendorId
      const vendorName = entry.vendor?.name || 'Unknown Vendor'
      
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendorId,
          vendorName,
          unsettled: 0,
          settled: 0
        })
      }

      const vendor = vendorMap.get(vendorId)!
      
      if (entry.settlementStatus === 'UNSETTLED') {
        vendor.unsettled += entry.netAmount
      } else {
        vendor.settled += entry.netAmount
      }
    }

    const vendorBreakdown = Array.from(vendorMap.values()).map(v => ({
      vendorId: v.vendorId,
      vendorName: v.vendorName,
      unsettledAmount: v.unsettled,
      settledAmount: v.settled
    }))

    const totalUnsettledPayables = vendorBreakdown.reduce((sum, v) => sum + v.unsettledAmount, 0)
    const settledAmount = vendorBreakdown.reduce((sum, v) => sum + v.settledAmount, 0)

    return {
      totalUnsettledPayables,
      settledAmount,
      vendorBreakdown
    }
  },

  /**
   * P&L Report
   * 
   * Revenue is ledger-derived. Costs are manual inputs.
   */
  async generatePnLReport(
    tx: Prisma.TransactionClient,
    filters: ReportFilters,
    costs: {
      paymentGateway?: number
      infrastructure?: number
      salaries?: number
      marketing?: number
    }
  ): Promise<PnLReport> {
    // Get revenue from ledger
    const revenueReport = await this.generateRevenueReport(tx, filters)
    const revenue = revenueReport.netPlatformRevenue

    // Aggregate costs
    const totalCosts = (costs.paymentGateway || 0) +
      (costs.infrastructure || 0) +
      (costs.salaries || 0) +
      (costs.marketing || 0)

    const grossMargin = revenue
    const netProfitLoss = revenue - totalCosts

    return {
      revenue,
      costs: {
        paymentGateway: costs.paymentGateway || 0,
        infrastructure: costs.infrastructure || 0,
        salaries: costs.salaries || 0,
        marketing: costs.marketing || 0,
        total: totalCosts
      },
      grossMargin,
      netProfitLoss
    }
  },

  /**
   * Reconciliation Report
   * 
   * MOST IMPORTANT: Ensures data integrity.
   * Any mismatch BLOCKS payouts.
   */
  async generateReconciliationReport(
    tx: Prisma.TransactionClient,
    filters: ReportFilters
  ): Promise<ReconciliationReport> {
    const where = this.buildWhereClause(filters)

    const entries = await tx.ledgerEntry.findMany({
      where: {
        ...where,
        type: { in: ['SALE', 'REFUND'] }
      },
      select: {
        grossAmount: true,
        netAmount: true,
        platformFee: true,
        taxAmount: true,
        settlementStatus: true
      }
    })

    const assertions: ReconciliationReport['assertions'] = []

    // Assertion 1: Gross = Net + Platform Fee + Tax
    const totalGross = entries.reduce((sum, e) => sum + e.grossAmount, 0)
    const totalNet = entries.reduce((sum, e) => sum + e.netAmount, 0)
    const totalPlatformFee = entries.reduce((sum, e) => sum + e.platformFee, 0)
    const totalTax = entries.reduce((sum, e) => sum + e.taxAmount, 0)
    const calculatedGross = totalNet + totalPlatformFee + totalTax

    assertions.push({
      name: 'Gross Amount = Net + Platform Fee + Tax',
      expected: totalGross,
      actual: calculatedGross,
      passed: totalGross === calculatedGross,
      difference: totalGross - calculatedGross
    })

    // Assertion 2: Settled + Unsettled = Total
    const settledEntries = entries.filter(e => e.settlementStatus === 'SETTLED')
    const unsettledEntries = entries.filter(e => e.settlementStatus === 'UNSETTLED')
    
    const settledNet = settledEntries.reduce((sum, e) => sum + e.netAmount, 0)
    const unsettledNet = unsettledEntries.reduce((sum, e) => sum + e.netAmount, 0)
    const totalNetCheck = settledNet + unsettledNet

    assertions.push({
      name: 'Settled + Unsettled = Total Net',
      expected: totalNet,
      actual: totalNetCheck,
      passed: totalNet === totalNetCheck,
      difference: totalNet - totalNetCheck
    })

    // Assertion 3: Entry count check
    assertions.push({
      name: 'Entry Count Consistency',
      expected: entries.length,
      actual: settledEntries.length + unsettledEntries.length,
      passed: entries.length === (settledEntries.length + unsettledEntries.length),
      difference: 0
    })

    // Determine overall status
    const overallStatus = assertions.every(a => a.passed) ? 'PASS' : 'FAIL'
    const criticalFailures = assertions
      .filter(a => !a.passed)
      .map(a => `${a.name}: Expected ${a.expected}, got ${a.actual} (diff: ${a.difference})`)

    return {
      assertions,
      overallStatus,
      criticalFailures
    }
  }
}
