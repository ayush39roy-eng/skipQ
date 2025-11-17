import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCashfreeWebhookSignature } from '@/lib/cashfree'
import { sendWhatsApp, buildOrderButtons } from '@/lib/whatsapp'

type CashfreeWebhookOrder = {
  order_id?: string
  order_status?: string
}

type CashfreeWebhookPayload = {
  order_id?: string
  order_status?: string
  data?: {
    order?: CashfreeWebhookOrder
  }
}

export async function POST(req: Request) {
  const raw = await req.text()
  let payload: CashfreeWebhookPayload
  try { payload = JSON.parse(raw) as CashfreeWebhookPayload } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const signature = req.headers.get('x-webhook-signature') || undefined
  if (!verifyCashfreeWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
  const orderIdExternal = payload?.data?.order?.order_id || payload?.order_id
  const status = payload?.data?.order?.order_status || payload?.order_status
  if (!orderIdExternal) return NextResponse.json({ error: 'Missing order id' }, { status: 400 })
  // Find payment by externalOrderId
  const payment = await prisma.payment.findFirst({ where: { externalOrderId: orderIdExternal } })
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  // If already marked paid, treat as idempotent and do nothing further
  if (payment.status === 'PAID') {
    return NextResponse.json({ ok: true })
  }
  if (status === 'PAID' || status === 'SUCCESS' || status === 'COMPLETED') {
    await prisma.payment.update({ where: { orderId: payment.orderId }, data: { status: 'PAID', paidAt: new Date() } })
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'PAID' } })
    // Send WhatsApp to vendor with Confirm/Cancel buttons
    const order = await prisma.order.findUnique({ where: { id: payment.orderId }, include: { items: { include: { menuItem: true } }, canteen: { include: { vendor: true } } } })
    const vendor = order?.canteen?.vendor
    const itemSummary = order?.items.slice(0, 3)
      .map(i => `${i.menuItem?.name ?? 'Unknown item'} x${i.quantity}`)
      .join(', ') + (order && order.items.length > 3 ? '…' : '')
    const notificationPhones = order?.canteen?.notificationPhones && order.canteen.notificationPhones.length
      ? order.canteen.notificationPhones
      : (vendor?.phone ? [vendor.phone] : [])
    const validPhones = (notificationPhones || []).map(p => (p || '').trim()).filter(Boolean)
    if (order && vendor?.whatsappEnabled && validPhones.length) {
      const total = (order.totalCents / 100).toFixed(2)
      const shortId = order.id.slice(0, 8)
      await Promise.allSettled(validPhones.map(async (to) => {
        try {
          await sendWhatsApp(to, {
            header: 'New Paid Order',
            text: `Order ${shortId} — ₹${total}. ${itemSummary || 'Items'}\nReply CONFIRM:${order.id} or CANCEL:${order.id}`,
            buttons: buildOrderButtons(order.id)
          })
        } catch (err) {
          console.error(`Failed to notify ${to} for order ${shortId}:`, err)
        }
      }))
    }
  }
  return NextResponse.json({ ok: true })
}
