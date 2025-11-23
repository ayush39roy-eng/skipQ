import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRazorpaySignature } from '@/lib/razorpay'
import { markOrderAsPaid } from '@/lib/order-payment'

export async function POST(req: Request) {
  const raw = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  if (!verifyRazorpaySignature(raw, signature || '')) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: { event: string, payload?: { payment?: { entity?: { id: string, order_id: string } }, order?: { entity?: { id: string } } } }
  try { payload = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const event = payload.event
  const paymentEntity = payload.payload?.payment?.entity
  const orderEntity = payload.payload?.order?.entity

  // We are interested in payment.captured or order.paid
  if (event === 'payment.captured' || event === 'order.paid') {
    const externalOrderId = orderEntity?.id || paymentEntity?.order_id

    if (!externalOrderId) {
      // If we don't have an order_id, we can't link it easily unless we stored payment_id
      // But we store externalOrderId (razorpay_order_id)
      return NextResponse.json({ ok: true }) // Idempotent
    }

    const payment = await prisma.payment.findFirst({ where: { externalOrderId } })
    if (!payment) {
      // Might be a payment for something else or not found
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status === 'PAID') {
      return NextResponse.json({ ok: true })
    }

    await markOrderAsPaid(payment.orderId)
  }

  return NextResponse.json({ ok: true })
}
