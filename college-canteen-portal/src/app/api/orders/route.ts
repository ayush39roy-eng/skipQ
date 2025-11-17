import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { calculateCommissionSplit } from '@/lib/billing'
import { sendWhatsApp, buildOrderButtons } from '@/lib/whatsapp'

type OrderItemPayload = {
  menuItemId: string
  quantity: number
}

type OrderRequestBody = {
  canteenId: string
  items: OrderItemPayload[]
}

function isOrderItemPayload(value: unknown): value is OrderItemPayload {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.menuItemId === 'string' && typeof item.quantity === 'number' && item.quantity > 0
}

function parseOrderBody(payload: unknown): OrderRequestBody | null {
  if (!payload || typeof payload !== 'object') return null
  const body = payload as Record<string, unknown>
  if (typeof body.canteenId !== 'string' || !Array.isArray(body.items)) return null
  const items = body.items.filter(isOrderItemPayload)
  if (!items.length) return null
  return { canteenId: body.canteenId, items }
}

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await requireRole(['USER'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = parseOrderBody(await req.json())
  if (!body) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  const { canteenId, items } = body

  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: items.map((i) => i.menuItemId) }, canteenId } })
  if (menuItems.length === 0) return NextResponse.json({ error: 'No items' }, { status: 400 })

  let total = 0
  const orderItems = items.map((item) => {
    const mi = menuItems.find((m: typeof menuItems[number]) => m.id === item.menuItemId)
    if (!mi) return null
    total += mi.priceCents * item.quantity
    return { menuItemId: mi.id, quantity: item.quantity, priceCents: mi.priceCents }
  }).filter(Boolean) as {menuItemId:string, quantity:number, priceCents:number}[]

  const canteen = await prisma.canteen.findUnique({ where: { id: canteenId }, include: { vendor: true } })
  if (!canteen) return NextResponse.json({ error: 'Canteen not found' }, { status: 404 })
  const { commissionCents, vendorTakeCents } = calculateCommissionSplit(total)

  const order = await prisma.order.create({
    data: {
      userId: session.userId,
      canteenId,
      vendorId: canteen.vendorId,
      totalCents: total,
      commissionCents,
      vendorTakeCents,
      items: { create: orderItems }
    }
  })
  // Notify vendor via WhatsApp if enabled
  const vendorPhone = canteen.vendor?.phone
  const waEnabled = canteen.vendor?.whatsappEnabled
  if (waEnabled && vendorPhone) {
    try {
      const lines = orderItems.map(oi => {
        const mi = menuItems.find((m: typeof menuItems[number]) => m.id === oi.menuItemId)!
        return `- ${oi.quantity} x ${mi.name}`
      }).join('\n')
      const amount = `₹${(total/100).toFixed(2)}`
      await sendWhatsApp(vendorPhone, {
        header: 'New Order',
        text: `Order ${order.id.slice(0,8)} for ${canteen.name}\n${lines}\nTotal: ${amount}\nConfirm or Cancel?`,
        buttons: buildOrderButtons(order.id)
      })
    } catch {}
  }
  return NextResponse.json({ id: order.id })
}

export async function GET() {
  const session = await requireRole(['USER'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orders = await prisma.order.findMany({ where: { userId: session.userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(orders)
}
