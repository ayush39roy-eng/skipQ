import { describe, it, expect } from 'vitest'
import { calculateCommissionSplit } from '../src/lib/billing'

describe('calculateCommissionSplit', () => {
  it('calculates 2.5% commission rounded and totals', () => {
    const { commissionCents, vendorTakeCents, totalWithFeeCents } = calculateCommissionSplit(10000) // ₹100 subtotal
    expect(commissionCents).toBe(250)
    expect(vendorTakeCents).toBe(10000)
    expect(totalWithFeeCents).toBe(10250)
  })
})
