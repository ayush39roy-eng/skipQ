import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCashfreeWebhookSignature } from '@/lib/cashfree'

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
  if (status === 'PAID' || status === 'SUCCESS' || status === 'COMPLETED') {
    await prisma.payment.update({ where: { orderId: payment.orderId }, data: { status: 'PAID', paidAt: new Date() } })
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'PAID' } })
  }
  return NextResponse.json({ ok: true })
}
