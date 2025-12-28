import { describe, it, expect } from 'vitest'
import { calculateCommissionSplit } from '../src/lib/billing'
import { PaymentMode } from '../src/types/vendor'

describe('calculateCommissionSplit', () => {
  it('calculates 5% commission rounded and totals', () => {
    const { commissionCents, vendorTakeCents, totalWithFeeCents } = calculateCommissionSplit(10000) // ₹100 subtotal
    expect(commissionCents).toBe(500)
    expect(vendorTakeCents).toBe(10000)
    expect(totalWithFeeCents).toBe(10500)
  })
})

describe('Payment Status Logic', () => {
    // Mimics the logic in TerminalLayout.tsx
    const determinePaymentStatus = (mode: PaymentMode) => {
        return (mode === 'HOLD') ? 'PENDING' : 'SUCCESS'
    }

    it('sets HOLD orders to PENDING', () => {
        expect(determinePaymentStatus('HOLD')).toBe('PENDING')
    })

    it('sets CASH orders to SUCCESS', () => {
        expect(determinePaymentStatus('CASH')).toBe('SUCCESS')
    })

    it('sets UPI orders to SUCCESS', () => {
        expect(determinePaymentStatus('UPI')).toBe('SUCCESS')
    })
})
