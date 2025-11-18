export function calculateCommissionSplit(subtotalCents: number) {
  const commissionCents = Math.round(subtotalCents * 0.025)
  const totalWithFeeCents = subtotalCents + commissionCents
  const vendorTakeCents = subtotalCents
  return { commissionCents, vendorTakeCents, totalWithFeeCents }
}
