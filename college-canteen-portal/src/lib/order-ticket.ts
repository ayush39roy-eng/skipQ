export function getTicketNumber(orderId: string): string {
  if (!orderId) return '0000'
  const segment = orderId.slice(-6)
  const parsed = Number.parseInt(segment, 16)
  const numeric = Number.isNaN(parsed) ? fallbackHash(orderId) : parsed % 10000
  return numeric.toString().padStart(4, '0')
}

function fallbackHash(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) & 0xffff
  }
  return Math.abs(hash % 10000)
}
