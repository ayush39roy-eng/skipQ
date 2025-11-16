export function calculateCommissionSplit(totalCents: number) {
  const commission = Math.round(totalCents * 0.025)
  const vendorTake = totalCents - commission
  return { commissionCents: commission, vendorTakeCents: vendorTake }
}
