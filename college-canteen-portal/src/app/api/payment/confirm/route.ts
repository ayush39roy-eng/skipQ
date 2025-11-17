import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp, buildOrderButtons } from '@/lib/whatsapp'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true, items: { include: { menuItem: true } }, canteen: { include: { vendor: true } } } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  // Idempotency guard: if already paid, skip updates/notifications
  if (order.payment?.status === 'PAID') {
    return NextResponse.redirect(new URL(`/order/${order.id}`, req.url))
  }
  await prisma.payment.update({ where: { orderId: order.id }, data: { status: 'PAID', paidAt: new Date() } })
  await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } })
  // Notify vendor via WhatsApp (if enabled)
  const vendor = order.canteen?.vendor
  const total = (order.totalCents / 100).toFixed(2)
  const shortId = order.id.slice(0, 8)
  const itemSummary = order.items.slice(0,3)
    .map(i => `${i.menuItem?.name ?? 'Unknown item'} x${i.quantity}`)
    .join(', ') + (order.items.length>3 ? '…' : '')
  const phones = (order.canteen?.notificationPhones && order.canteen.notificationPhones.length
    ? order.canteen.notificationPhones
    : (vendor?.phone ? [vendor.phone] : [])).filter(Boolean)
  if (vendor?.whatsappEnabled && phones.length) {
    for (const to of phones) {
      try {
        await sendWhatsApp(to, {
          header: 'New Paid Order',
          text: `Order ${shortId} — ₹${total}. ${itemSummary || 'Items'}\nReply CONFIRM:${shortId} or CANCEL:${shortId}`,
          buttons: buildOrderButtons(shortId)
        })
      } catch (err) {
        console.error(`Failed to notify ${to} for order ${shortId}:`, err)
      }
    }
  }
  return NextResponse.redirect(new URL(`/order/${order.id}`, req.url))
}
