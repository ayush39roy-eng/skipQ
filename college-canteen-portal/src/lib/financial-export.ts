import type { 
  RevenueReport, 
  GSTLiabilityReport, 
  CashFlowReport,
  VendorLiabilityReport,
  PnLReport,
  ReconciliationReport
} from '@/app/vendor/services/financial-reporting-service'

/**
 * Financial Report Export Utility
 * 
 * Generates CSV exports for company financial reports.
 * All exports are immutable snapshots with metadata.
 */
export class FinancialExportUtility {
  private static csvEscape(value: string | number | Date | null | undefined): string {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  private static formatCurrency(cents: number): string {
    return `₹${(cents / 100).toFixed(2)}`
  }

  /**
   * Export Revenue Report as CSV
   */
  static exportRevenueCSV(
    report: RevenueReport,
    metadata: { dateRange: { start: Date, end: Date }, filters: string }
  ): string {
    const rows: string[] = []

    // Metadata
    rows.push('Company Revenue Report')
    rows.push(`Generated: ${new Date().toISOString()}`)
    rows.push(`Period: ${metadata.dateRange.start.toISOString()} to ${metadata.dateRange.end.toISOString()}`)
    rows.push(`Filters: ${metadata.filters}`)
    rows.push('')

    // Data
    rows.push('Metric,Value')
    rows.push(`Gross Platform Fees,${this.formatCurrency(report.grossPlatformFees)}`)
    rows.push(`Platform GST Collected (18%),${this.formatCurrency(report.platformGSTCollected)}`)
    rows.push(`Net Platform Revenue,${this.formatCurrency(report.netPlatformRevenue)}`)
    rows.push(`Total Orders,${report.ordersCount}`)
    rows.push(`Average Fee per Order,${this.formatCurrency(report.averageFeePerOrder)}`)

    return rows.join('\n')
  }

  /**
   * Export GST Liability Report as CSV
   */
  static exportGSTLiabilityCSV(
    report: GSTLiabilityReport,
    metadata: { dateRange: { start: Date, end: Date }, filters: string }
  ): string {
    const rows: string[] = []

    // Metadata
    rows.push('GST Liability Report (COMPLIANCE-CRITICAL)')
    rows.push(`Generated: ${new Date().toISOString()}`)
    rows.push(`Period: ${metadata.dateRange.start.toISOString()} to ${metadata.dateRange.end.toISOString()}`)
    rows.push(`Filters: ${metadata.filters}`)
    rows.push('')

    // Important Notice
    rows.push('NOTICE: This report includes ONLY platform fee GST (18%)')
    rows.push('Vendor food GST is EXCLUDED from this report')
    rows.push('')

    // Data
    rows.push('Metric,Value')
    rows.push(`Platform Fee GST Collected,${this.formatCurrency(report.platformFeeGSTCollected)}`)
    rows.push(`GST Paid/Payable,${this.formatCurrency(report.gstPaid)}`)
    rows.push(`Net GST Liability,${this.formatCurrency(report.netGSTLiability)}`)

    return rows.join('\n')
  }

  /**
   * Export Cash Flow Report as CSV
   */
  static exportCashFlowCSV(
    report: CashFlowReport,
    metadata: { dateRange: { start: Date, end: Date }, filters: string }
  ): string {
    const rows: string[] = []

    // Metadata
    rows.push('Cash Flow Report')
    rows.push(`Generated: ${new Date().toISOString()}`)
    rows.push(`Period: ${metadata.dateRange.start.toISOString()} to ${metadata.dateRange.end.toISOString()}`)
    rows.push(`Filters: ${metadata.filters}`)
    rows.push('')

    // Data
    rows.push('Metric,Value')
    rows.push(`Cash In (User Payments),${this.formatCurrency(report.cashIn)}`)
    rows.push(`Cash Out (Vendor Settlements),${this.formatCurrency(report.cashOut)}`)
    rows.push(`Platform Fee Retained,${this.formatCurrency(report.platformFeeRetained)}`)
    rows.push(`Pending Liabilities (Unsettled),${this.formatCurrency(report.pendingLiabilities)}`)
    rows.push(`Net Cash Flow,${this.formatCurrency(report.netCashFlow)}`)

    return rows.join('\n')
  }

  /**
   * Export Vendor Liability Report as CSV
   */
  static exportVendorLiabilityCSV(
    report: VendorLiabilityReport,
    metadata: { dateRange: { start: Date, end: Date }, filters: string }
  ): string {
    const rows: string[] = []

    // Metadata
    rows.push('Vendor Liability Report')
    rows.push(`Generated: ${new Date().toISOString()}`)
    rows.push(`Period: ${metadata.dateRange.start.toISOString()} to ${metadata.dateRange.end.toISOString()}`)
    rows.push(`Filters: ${metadata.filters}`)
    rows.push('')

    // Summary
    rows.push('Summary')
    rows.push(`Total Unsettled Payables,${this.formatCurrency(report.totalUnsettledPayables)}`)
    rows.push(`Total Settled Amount,${this.formatCurrency(report.settledAmount)}`)
    rows.push('')

    // Vendor Breakdown
    rows.push('Vendor Breakdown')
    rows.push('Vendor ID,Vendor Name,Unsettled Amount,Settled Amount')
    
    for (const vendor of report.vendorBreakdown) {
      rows.push([
        vendor.vendorId,
        this.csvEscape(vendor.vendorName),
        this.formatCurrency(vendor.unsettledAmount),
        this.formatCurrency(vendor.settledAmount)
      ].join(','))
    }

    return rows.join('\n')
  }

  /**
   * Export P&L Report as CSV
   */
  static exportPnLCSV(
    report: PnLReport,
    metadata: { dateRange: { start: Date, end: Date }, filters: string }
  ): string {
    const rows: string[] = []

    // Metadata
    rows.push('Profit & Loss Report')
    rows.push(`Generated: ${new Date().toISOString()}`)
    rows.push(`Period: ${metadata.dateRange.start.toISOString()} to ${metadata.dateRange.end.toISOString()}`)
    rows.push(`Filters: ${metadata.filters}`)
    rows.push('')

    // Revenue
    rows.push('Revenue')
    rows.push(`Net Platform Revenue,${this.formatCurrency(report.revenue)}`)
    rows.push('')

    // Costs
    rows.push('Costs')
    rows.push(`Payment Gateway Fees,${this.formatCurrency(report.costs.paymentGateway)}`)
    rows.push(`Infrastructure,${this.formatCurrency(report.costs.infrastructure)}`)
    rows.push(`Salaries,${this.formatCurrency(report.costs.salaries)}`)
    rows.push(`Marketing,${this.formatCurrency(report.costs.marketing)}`)
    rows.push(`Total Costs,${this.formatCurrency(report.costs.total)}`)
    rows.push('')

    // Profit/Loss
    rows.push('Summary')
    rows.push(`Gross Margin,${this.formatCurrency(report.grossMargin)}`)
    rows.push(`Net Profit/Loss,${this.formatCurrency(report.netProfitLoss)}`)

    return rows.join('\n')
  }

  /**
   * Export Reconciliation Report as CSV
   */
  static exportReconciliationCSV(
    report: ReconciliationReport,
    metadata: { dateRange: { start: Date, end: Date }, filters: string }
  ): string {
    const rows: string[] = []

    // Metadata
    rows.push('Reconciliation Report (CRITICAL)')
    rows.push(`Generated: ${new Date().toISOString()}`)
    rows.push(`Period: ${metadata.dateRange.start.toISOString()} to ${metadata.dateRange.end.toISOString()}`)
    rows.push(`Filters: ${metadata.filters}`)
    rows.push('')

    // Overall Status
    rows.push(`Overall Status: ${report.overallStatus}`)
    rows.push('')

    // Assertions rows.push('Assertions')
    rows.push('Assertion,Expected,Actual,Status,Difference')
    
    for (const assertion of report.assertions) {
      rows.push([
        this.csvEscape(assertion.name),
        this.formatCurrency(assertion.expected),
        this.formatCurrency(assertion.actual),
        assertion.passed ? 'PASS' : 'FAIL',
        this.formatCurrency(assertion.difference)
      ].join(','))
    }

    // Critical Failures
    if (report.criticalFailures.length > 0) {
      rows.push('')
      rows.push('CRITICAL FAILURES')
      report.criticalFailures.forEach(failure => {
        rows.push(this.csvEscape(failure))
      })
    }

    return rows.join('\n')
  }
}
