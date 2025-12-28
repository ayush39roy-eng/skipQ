export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
export type OrderSource = 'ONLINE' | 'COUNTER'
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'HOLD'
export type FulfillmentType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'

export interface VendorItem {
  id: string
  name: string
  priceCents: number
  section?: string | null
  isVegetarian: boolean
  available: boolean
}

export interface VendorOrderItem {
  itemId: string
  name: string
  priceCents: number
  quantity: number
}

export interface VendorOrder {
  id: string
  ticket: string // e.g. #A123
  source: OrderSource
  status: OrderStatus
  items: VendorOrderItem[]
  totalCents: number
  paymentStatus: 'PAID' | 'UNPAID' | 'PENDING' | 'FAILED' | 'UNKNOWN'
  paymentMode?: PaymentMode
  fulfillmentType: FulfillmentType
  createdAt: Date
  customerName?: string
  customerPhone?: string
  prepTimeMinutes?: number
}

export interface LedgerEntry {
  id: string
  timestamp: Date
  orderId: string
  type: 'SALE' | 'REFUND' | 'FEE' | 'EXPENSE' | 'PAYOUT' | 'OTHER'
  description: string
  amountCents: number // Positive for sales, negative for refunds/fees
  paymentMode: PaymentMode | string
  source: OrderSource | string
}

export interface PosState {
  viewMode: 'POS' | 'LEDGER' | 'SETTINGS' | 'ANALYTICS'
  currentTab: 'QUEUE' | 'HISTORY'
  selectedOrderId: string | null
  cart: { item: VendorItem; qty: number }[]
  searchQuery: string
  selectedCategory: string
  isRushMode: boolean
}
