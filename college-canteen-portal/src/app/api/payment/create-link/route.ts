import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createCashfreeOrder } from '@/lib/cashfree'

async function resolvePaymentLink(orderId: string, req: Request) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true } })
  if (!order) return { error: NextResponse.json({ error: 'Order not found' }, { status: 404 }) }

  const hasCashfree = process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY
  let paymentLink: string
  let externalOrderId: string | undefined
  if (hasCashfree) {
    const cfOrderId = `cf_${order.id}`
    const amountRupees = (order.totalCents / 100).toFixed(2)
    try {
      const base = process.env.APP_BASE_URL || new URL(req.url).origin
      const cfResp = await createCashfreeOrder({
        order_id: cfOrderId,
        order_amount: Number(amountRupees),
        order_currency: 'INR',
        customer_details: {
          customer_id: order.userId,
          customer_email: order.user.email,
        },
        order_note: 'College Canteen Order',
        return_url: `${base}/api/payment/confirm?orderId=${order.id}`,
        notify_url: `${base}/api/payment/webhook`,
      })
      paymentLink = cfResp.payment_link || `${base}/pay/${order.id}`
      externalOrderId = cfResp.order_id
      await prisma.payment.upsert({
        where: { orderId: order.id },
        update: { paymentLink, amountCents: order.totalCents, provider: 'cashfree', externalOrderId },
        create: { orderId: order.id, amountCents: order.totalCents, paymentLink, provider: 'cashfree', externalOrderId }
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown Cashfree error'
      return { error: NextResponse.json({ error: 'Cashfree order failed', detail }, { status: 500 }) }
    }
  } else {
    paymentLink = `/pay/${order.id}`
    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: { paymentLink, amountCents: order.totalCents },
      create: { orderId: order.id, amountCents: order.totalCents, paymentLink }
    })
  }
  return { paymentLink }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  const result = await resolvePaymentLink(orderId, req)
  if ('error' in result) return result.error
  const { paymentLink } = result
  const target = paymentLink.startsWith('http') ? paymentLink : new URL(paymentLink, req.url)
  return NextResponse.redirect(target)
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  let orderId = url.searchParams.get('orderId')
  if (!orderId) {
    try {
      const body = await req.json()
      if (body && typeof body.orderId === 'string') {
        orderId = body.orderId
      }
    } catch {
      // ignore body parse errors
    }
  }
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  const result = await resolvePaymentLink(orderId, req)
  if ('error' in result) return result.error
  const { paymentLink } = result
  const absoluteLink = paymentLink.startsWith('http') ? paymentLink : new URL(paymentLink, req.url).toString()
  return NextResponse.json({ redirectUrl: absoluteLink, url: absoluteLink })
}
