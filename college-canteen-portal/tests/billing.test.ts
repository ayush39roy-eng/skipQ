import { describe, it, expect } from 'vitest'
import { calculateCommissionSplit } from '../src/lib/billing'

describe('calculateCommissionSplit', () => {
  it('calculates 2.5% commission rounded', () => {
    const { commissionCents, vendorTakeCents } = calculateCommissionSplit(10000) // ₹100
    expect(commissionCents).toBe(250)
    expect(vendorTakeCents).toBe(9750)
  })
})
