import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { calculateCommissionSplit } from '@/lib/billing'
import { sendWhatsApp, buildOrderButtons } from '@/lib/whatsapp'

export async function POST(req: Request) {
  const session = await requireRole(['USER'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { canteenId, items } = await req.json()
  if (!canteenId || !Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: items.map((i:any)=>i.menuItemId) }, canteenId } })
  if (menuItems.length === 0) return NextResponse.json({ error: 'No items' }, { status: 400 })

  let total = 0
  const orderItems = items.map((i:any) => {
    const mi = menuItems.find(m=>m.id===i.menuItemId)
    if (!mi) return null
    total += mi.priceCents * i.quantity
    return { menuItemId: mi.id, quantity: i.quantity, priceCents: mi.priceCents }
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
  const waEnabled = (canteen.vendor as any)?.whatsappEnabled
  if (waEnabled && vendorPhone) {
    try {
      const lines = orderItems.map(oi => {
        const mi = menuItems.find(m=>m.id===oi.menuItemId)!
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
