/**
 * Tax Calculation Utility
 * 
 * Handles food tax calculations for both tax-inclusive and tax-exclusive pricing.
 * All calculations done in cents to avoid floating-point precision issues.
 */

export type TaxConfig = {
  itemPriceCents: number
  quantity: number
  taxRate: number  // Percentage (e.g., 5 for 5%)
  isTaxInclusive: boolean
}

export type TaxResult = {
  baseAmount: number  // Food price excluding tax (in cents)
  taxAmount: number   // Tax amount (in cents)
  totalAmount: number  // Total including tax (in cents)
}

/**
 * Calculate tax for a single item
 * 
 * Tax-Inclusive Example: ₹105 includes 5% tax
 *   → Base = ₹100, Tax = ₹5, Total = ₹105
 * 
 * Tax-Exclusive Example: ₹100 + 5% tax
 *   → Base = ₹100, Tax = ₹5, Total = ₹105
 * 
 * @param config Tax configuration
 * @returns Tax breakdown
 */
export function calculateItemTax(config: TaxConfig): TaxResult {
  const { itemPriceCents, quantity, taxRate, isTaxInclusive } = config
  const itemTotal = itemPriceCents * quantity
  
  // No tax scenario
  if (taxRate === 0) {
    return {
      baseAmount: itemTotal,
      taxAmount: 0,
      totalAmount: itemTotal
    }
  }
  
  if (isTaxInclusive) {
    // Price already includes tax
    // Formula: Base = Total / (1 + rate/100)
    const taxRatio = taxRate / 100
    const baseAmount = Math.round(itemTotal / (1 + taxRatio))
    const taxAmount = itemTotal - baseAmount
    
    return {
      baseAmount,
      taxAmount,
      totalAmount: itemTotal
    }
  } else {
    // Tax is added on top of base price
    // Formula: Tax = Base * (rate/100)
    const taxRatio = taxRate / 100
    const taxAmount = Math.round(itemTotal * taxRatio)
    const totalAmount = itemTotal + taxAmount
    
    return {
      baseAmount: itemTotal,
      taxAmount,
      totalAmount
    }
  }
}

/**
 * Calculate aggregate tax for multiple items
 * 
 * @param items Array of tax configurations
 * @returns Aggregated tax breakdown
 */
export function calculateOrderTax(items: TaxConfig[]): TaxResult {
  let totalBase = 0
  let totalTax = 0
  let total = 0
  
  for (const item of items) {
    const result = calculateItemTax(item)
    totalBase += result.baseAmount
    totalTax += result.taxAmount
    total += result.totalAmount
  }
  
  return {
    baseAmount: totalBase,
    taxAmount: totalTax,
    totalAmount: total
  }
}
