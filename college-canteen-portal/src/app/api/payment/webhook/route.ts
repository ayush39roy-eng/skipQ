import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCashfreeWebhookSignature } from '@/lib/cashfree'
import { sendWhatsApp, buildOrderButtons } from '@/lib/whatsapp'

export async function POST(req: Request) {
  const raw = await req.text()
  let payload: any
  try { payload = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
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
    const order = await prisma.order.findUnique({ where: { id: payment.orderId }, include: { canteen: { include: { vendor: true } } } })
    const vendor = order?.canteen?.vendor
    const to = vendor?.phone || ''
    if (order && vendor?.whatsappEnabled && to) {
      const total = (order.totalCents / 100).toFixed(2)
      const shortId = order.id.slice(0, 8)
      await sendWhatsApp(to, {
        header: 'New Paid Order',
        text: `Order ${shortId} — ₹${total}. Please confirm or cancel.`,
        buttons: buildOrderButtons(order.id)
      })
    }
  }
  return NextResponse.json({ ok: true })
}
