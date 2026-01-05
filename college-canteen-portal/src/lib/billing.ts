import { OrderType } from './geofencing'

export type PlatformFeeConfig = {
  orderType: OrderType
  subtotalCents: number
}

export type PlatformFeeResult = {
  platformFeeRate: number
  platformFeeAmount: number
}

/**
 * Calculate platform fee based on order type
 * SELF_ORDER = 1.5% (user is near canteen, instant order)
 * PRE_ORDER = 3.0% (user is far, pre-ordering for later)
 */
export function calculatePlatformFee(config: PlatformFeeConfig): PlatformFeeResult {
  const rate = config.orderType === OrderType.SELF_ORDER ? 0.015 : 0.03
  const amount = Math.round(config.subtotalCents * rate)
  
  return {
    platformFeeRate: rate,
    platformFeeAmount: amount
  }
}

/**
 * @deprecated Legacy commission calculation - use calculatePlatformFee for new implementations
 * Kept for backward compatibility with existing code
 */
export function calculateCommissionSplit(subtotalCents: number) {
  const commissionCents = Math.round(subtotalCents * 0.05)
  const totalWithFeeCents = subtotalCents + commissionCents
  const vendorTakeCents = subtotalCents
  return { commissionCents, vendorTakeCents, totalWithFeeCents }
}
