import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCashfreeWebhookSignature } from '@/lib/cashfree'
import { markOrderAsPaid } from '@/lib/order-payment'

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
    await markOrderAsPaid(payment.orderId)
  }
  return NextResponse.json({ ok: true })
}
