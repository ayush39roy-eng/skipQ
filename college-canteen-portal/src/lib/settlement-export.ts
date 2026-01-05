import type { SettlementBatch, Vendor, LedgerEntry, Order, OrderItem, MenuItem, User } from '@prisma/client'

type SettlementBatchWithRelations = SettlementBatch & {
  vendor: Vendor | null
  ledgerEntries?: (LedgerEntry & { 
    order: (Order & {
      items?: (OrderItem & { menuItem: MenuItem | null })[]
      user?: User | null
    }) | null 
  })[]
}

/**
 * CSV Export Utility for Settlement Batches
 * 
 * Generates bank-ready CSV files for vendor payouts.
 */
export class SettlementExportUtility {
  /**
   * Generate CSV header row
   */
  private static csvEscape(value: string | number | Date | null | undefined): string {
    if (value === null || value === undefined) return ''
    const str = String(value)
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  /**
   * Generate Excel-ready CSV with comprehensive order details
   * Vendor-friendly format - no commission details shown
   */
  static generateExcelCSV(batch: SettlementBatchWithRelations): string {
    const rows: string[] = []

    // Settlement Header
    rows.push(`SETTLEMENT REPORT - ${batch.vendor?.name || 'Unknown Vendor'}`)
    rows.push(`Settlement ID: ${batch.id}`)
    rows.push(`Period: ${batch.periodStartDate.toLocaleDateString()} to ${batch.periodEndDate.toLocaleDateString()}`)
    rows.push(`Generated: ${new Date().toLocaleString()}`)
    rows.push('')

    // Summary Section - Vendor sees only total sales and what they'll receive
    rows.push('FINANCIAL SUMMARY')
    rows.push(`Total Orders,${batch.totalOrders}`)
    rows.push(`Total Sales (Including Tax),Rs. ${((batch.totalFoodAmount + batch.totalTaxAmount) / 100).toFixed(2)}`)
    rows.push(`Tax Collected,Rs. ${(batch.totalTaxAmount / 100).toFixed(2)}`)
    rows.push(`Amount Payable to You,Rs. ${(batch.totalVendorPayable / 100).toFixed(2)}`)
    rows.push('')
    rows.push('')

    // Detailed Transactions - Clean order-by-order breakdown
    rows.push('ORDER DETAILS')
    rows.push([
      'Date & Time',
      'Order ID',
      'Customer Name',
      'Item Name',
      'Quantity',
      'Price (Rs.)',
      'Total (Rs.)'
    ].map(this.csvEscape).join(','))

    // Transaction data rows - one row per order item
    if (batch.ledgerEntries) {
      for (const entry of batch.ledgerEntries) {
        if (entry.order && entry.order.items && entry.order.items.length > 0) {
          const order = entry.order
          const customerName = order.user?.name || 'Guest'
          const orderDate = entry.timestamp.toLocaleString()
          const orderId = order.id.substring(0, 8)

          // Add a row for each item in the order
          for (const item of (order.items || [])) {
            rows.push([
              orderDate,
              orderId,
              customerName,
              item.menuItem?.name || 'Unknown Item',
              item.quantity,
              (item.priceCents / 100).toFixed(2),
              ((item.totalCents * item.quantity) / 100).toFixed(2)
            ].map(this.csvEscape).join(','))
          }
        }
      }
    }

    rows.push('')
    rows.push('')
    rows.push('SETTLEMENT SUMMARY')
    rows.push(`Total Amount Payable: Rs. ${(batch.totalVendorPayable / 100).toFixed(2)}`)
    rows.push(`This amount will be transferred to your registered bank account.`)

    return rows.join('\n')
  }

  /**
   * Generate summary CSV for a settlement batch
   * 
   * Contains high-level payout information suitable for bank transfer.
   */
  static generateSummaryCSV(batch: SettlementBatchWithRelations): string {
    const rows: string[] = []

    // Header
    rows.push([
      'Settlement Batch ID',
      'Vendor Name',
      'Period Start',
      'Period End',
      'Total Orders',
      'Food Amount (₹)',
      'Tax Amount (₹)',
      'Platform Fee (₹)',
      'Vendor Payable (₹)',
      'Status',
      'Created At',
      'Exported At'
    ].map(this.csvEscape).join(','))

    // Data row
    rows.push([
      batch.id,
      batch.vendor?.name || 'Unknown Vendor',
      batch.periodStartDate.toISOString(),
      batch.periodEndDate.toISOString(),
      batch.totalOrders,
      (batch.totalFoodAmount / 100).toFixed(2),
      (batch.totalTaxAmount / 100).toFixed(2),
      (batch.totalPlatformFee / 100).toFixed(2),
      (batch.totalVendorPayable / 100).toFixed(2),
      batch.status,
      batch.createdAt.toISOString(),
      batch.exportedAt?.toISOString() || 'Not Exported'
    ].map(this.csvEscape).join(','))

    return rows.join('\n')
  }

  /**
   * Generate detailed line-item CSV for a settlement batch
   * 
   * Contains all ledger entries included in the settlement.
   */
  static generateDetailedCSV(batch: SettlementBatchWithRelations): string {
    const rows: string[] = []

    // Header
    rows.push([
      'Settlement Batch ID',
      'Ledger Entry ID',
      'Order ID',
      'Entry Type',
      'Timestamp',
      'Gross Amount (₹)',
      'Tax Amount (₹)',
      'Platform Fee (₹)',
      'Net Amount (₹)',
      'Payment Mode',
      'Order Type',
      'Platform Fee Rate',
      'Description'
    ].map(this.csvEscape).join(','))

    // Data rows (one per ledger entry)
    if (batch.ledgerEntries) {
      for (const entry of batch.ledgerEntries) {
        rows.push([
          batch.id,
          entry.id,
          entry.orderId || 'N/A',
          entry.type,
          entry.timestamp.toISOString(),
          (entry.grossAmount / 100).toFixed(2),
          (entry.taxAmount / 100).toFixed(2),
          (entry.platformFee / 100).toFixed(2),
          (entry.netAmount / 100).toFixed(2),
          entry.paymentMode,
          entry.orderType || 'N/A',
          entry.platformFeeRate ? (entry.platformFeeRate * 100).toFixed(2) + '%' : 'N/A',
          entry.description || ''
        ].map(this.csvEscape).join(','))
      }
    }

    return rows.join('\n')
  }

  /**
   * Generate combined CSV with both summary and details
   */
  static generateCombinedCSV(batch: SettlementBatchWithRelations): string {
    const parts: string[] = []

    // Settlement Summary Section
    parts.push('=== SETTLEMENT SUMMARY ===')
    parts.push(this.generateSummaryCSV(batch))
    parts.push('')
    parts.push('')

    // Line Items Section
    parts.push('=== LEDGER ENTRIES (LINE ITEMS) ===')
    parts.push(this.generateDetailedCSV(batch))

    return parts.join('\n')
  }

  /**
   * Generate Excel-compatible CSV with metadata
   */
  static generateBankReadyCSV(batch: SettlementBatchWithRelations): string {
    const rows: string[] = []

    // Metadata Section
    rows.push(`Settlement Batch Report`)
    rows.push(`Generated: ${new Date().toISOString()}`)
    rows.push(`Batch ID: ${batch.id}`)
    rows.push(`Vendor: ${batch.vendor?.name || 'Unknown Vendor'}`)
    rows.push(`Period: ${batch.periodStartDate.toISOString()} to ${batch.periodEndDate.toISOString()}`)
    rows.push('')

    // Payment Summary
    rows.push('PAYMENT SUMMARY')
    rows.push(`Vendor Name,${this.csvEscape(batch.vendor?.name || 'Unknown Vendor')}`)
    rows.push(`Total Orders,${batch.totalOrders}`)
    rows.push(`Food Amount,₹${(batch.totalFoodAmount / 100).toFixed(2)}`)
    rows.push(`Tax Amount,₹${(batch.totalTaxAmount / 100).toFixed(2)}`)
    rows.push(`Platform Fee (Deducted),₹${(batch.totalPlatformFee / 100).toFixed(2)}`)
    rows.push(`VENDOR PAYABLE AMOUNT,₹${(batch.totalVendorPayable / 100).toFixed(2)}`)
    rows.push('')

    // Bank Details (if available)
    rows.push('BANK TRANSFER DETAILS')
    rows.push(`Beneficiary Name,${this.csvEscape(batch.vendor?.name || 'Unknown Vendor')}`)
    rows.push(`Amount to Transfer,₹${(batch.totalVendorPayable / 100).toFixed(2)}`)
    rows.push(`Settlement Batch ID,${batch.id}`)
    rows.push('')

    return rows.join('\n')
  }
}
