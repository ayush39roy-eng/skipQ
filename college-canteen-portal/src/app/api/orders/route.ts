import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { calculateCommissionSplit } from '@/lib/billing'
import { checkCanteenStatus } from '@/lib/canteen-utils'

type FulfillmentType = 'TAKEAWAY' | 'DINE_IN'

type OrderItemPayload = {
  menuItemId: string
  quantity: number
}

type OrderRequestBody = {
  canteenId: string
  items: OrderItemPayload[]
  fulfillmentType?: FulfillmentType
}

function isOrderItemPayload(value: unknown): value is OrderItemPayload {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.menuItemId === 'string' && typeof item.quantity === 'number' && item.quantity > 0 && item.quantity <= 100
}

function parseOrderBody(payload: unknown): OrderRequestBody | null {
  if (!payload || typeof payload !== 'object') return null
  const body = payload as Record<string, unknown>
  if (typeof body.canteenId !== 'string' || !Array.isArray(body.items)) return null
  const items = body.items.filter(isOrderItemPayload)
  if (!items.length) return null
  const rawMode = typeof body.fulfillmentType === 'string' ? body.fulfillmentType.toUpperCase() : undefined
  const fulfillmentType: FulfillmentType | undefined = rawMode === 'DINE_IN' ? 'DINE_IN' : rawMode === 'TAKEAWAY' ? 'TAKEAWAY' : undefined
  return { canteenId: body.canteenId, items, fulfillmentType }
}

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await requireRole(['USER'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = parseOrderBody(await req.json())
  if (!body) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  const { canteenId, items, fulfillmentType } = body

  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: items.map((i) => i.menuItemId) }, canteenId, available: true } })
  if (menuItems.length !== items.length) {
    // Some items were not found or are unavailable
    return NextResponse.json({ error: 'One or more items are unavailable or invalid' }, { status: 400 })
  }

  let subtotal = 0
  const orderItems = items.map((item) => {
    const mi = menuItems.find((m: typeof menuItems[number]) => m.id === item.menuItemId)
    if (!mi) return null
    subtotal += mi.priceCents * item.quantity
    return { menuItemId: mi.id, quantity: item.quantity, priceCents: mi.priceCents }
  }).filter(Boolean) as { menuItemId: string, quantity: number, priceCents: number }[]

  const canteen = await prisma.canteen.findUnique({
    where: { id: canteenId },
    include: { vendor: true }
  })
  if (!canteen) return NextResponse.json({ error: 'Canteen not found' }, { status: 404 })

  const status = checkCanteenStatus(canteen)
  if (!status.isOpen) {
    return NextResponse.json({ error: `Canteen is closed. ${status.message}` }, { status: 400 })
  }

  const { commissionCents, vendorTakeCents, totalWithFeeCents } = calculateCommissionSplit(subtotal)

  const order = await prisma.order.create({
    data: {
      userId: session.userId,
      canteenId,
      vendorId: canteen.vendorId,
      totalCents: totalWithFeeCents,
      commissionCents,
      vendorTakeCents,
      fulfillmentType: fulfillmentType ?? 'TAKEAWAY',
      items: { create: orderItems }
    }
  })
  return NextResponse.json({ id: order.id })
}

export async function GET() {
  const session = await requireRole(['USER'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orders = await prisma.order.findMany({ where: { userId: session.userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(orders)
}
