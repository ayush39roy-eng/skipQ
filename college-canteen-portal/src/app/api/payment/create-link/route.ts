import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createCashfreeOrder } from '@/lib/cashfree'
import { sendWhatsApp } from '@/lib/whatsapp'
import { writeLog } from '@/lib/log-writer'

const logPrefix = '[PaymentLink]'

function log(message: string, data?: Record<string, unknown>) {
  console.log(logPrefix, message, data)
  void writeLog('PaymentLink', { message, data })
}

const orderInclude = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    user: true,
    items: { include: { menuItem: true } },
    canteen: { include: { vendor: true } }
  }
})

type OrderWithRelations = Prisma.OrderGetPayload<typeof orderInclude>

async function notifyManualPayment(order: NonNullable<OrderWithRelations>) {
  const vendorPhones = order.canteen?.notificationPhones?.length
    ? order.canteen.notificationPhones
    : (order.canteen?.vendor?.phone ? [order.canteen.vendor.phone] : [])
  const validPhones = (vendorPhones || []).map(p => (p || '').trim()).filter(Boolean)
  log('Manual payment candidate phones', { orderId: order.id, vendorPhones, validPhones })
  if (!validPhones.length) return
  const total = (order.totalCents / 100).toFixed(2)
  const shortId = order.id.slice(0, 8)
  const itemSummary = order.items?.slice(0, 3)
    .map(item => `${item.menuItem?.name ?? 'Item'} x${item.quantity}`)
    .join(', ') ?? 'Items pending'
  const customer = order.user?.name || order.user?.email || 'Customer'
  const text = `Manual payment requested\nOrder ${shortId} — ₹${total}\n${itemSummary}${order.items && order.items.length > 3 ? '…' : ''}\nCustomer: ${customer}`
  log('Dispatching WhatsApp notifications', { orderId: order.id, count: validPhones.length })
  await Promise.allSettled(validPhones.map(async (phone) => {
    try {
      log('Sending WhatsApp to phone', { orderId: order.id, phone })
      await sendWhatsApp(phone, {
        text,
        header: 'Pay Now Triggered',
        templateVariables: {
          orderId: shortId,
          total,
          items: itemSummary,
          customer,
        }
      })
    } catch (error) {
      console.error('Failed to send manual payment WhatsApp', phone, error)
    }
  }))
  log('Manual payment notification loop complete', { orderId: order.id })
}

async function resolvePaymentLink(orderId: string, req: Request) {
  log('Resolving payment link', { orderId })
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    ...orderInclude
  })
  if (!order) {
    console.warn(logPrefix, 'Order not found', { orderId })
    return { error: NextResponse.json({ error: 'Order not found' }, { status: 404 }) }
  }

  const hasCashfree = process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY
  log('Cashfree check', { orderId, hasCashfree: Boolean(hasCashfree) })
  let paymentLink: string
  let externalOrderId: string | undefined
  if (hasCashfree) {
    const cfOrderId = `cf_${order.id}`
    const amountRupees = (order.totalCents / 100).toFixed(2)
    try {
      const base = process.env.APP_BASE_URL || new URL(req.url).origin
      log('Creating Cashfree order', { orderId, cfOrderId })
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
      log('Cashfree link resolved', { orderId, paymentLink })
      await prisma.payment.upsert({
        where: { orderId: order.id },
        update: { paymentLink, amountCents: order.totalCents, provider: 'cashfree', externalOrderId },
        create: { orderId: order.id, amountCents: order.totalCents, paymentLink, provider: 'cashfree', externalOrderId }
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown Cashfree error'
      console.error(logPrefix, 'Cashfree order failed', { orderId, detail })
      return { error: NextResponse.json({ error: 'Cashfree order failed', detail }, { status: 500 }) }
    }
  } else {
    paymentLink = `/pay/${order.id}`
    log('Manual payment path', { orderId, paymentLink })
    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: { paymentLink, amountCents: order.totalCents },
      create: { orderId: order.id, amountCents: order.totalCents, paymentLink }
    })
    try {
      await notifyManualPayment(order)
    } catch (error) {
      console.error(logPrefix, 'Manual payment notification failed', error)
    }
  }
  log('Resolve complete', { orderId, paymentLink })
  return { paymentLink }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  log('GET create-link', { orderId })
  const result = await resolvePaymentLink(orderId, req)
  if ('error' in result) return result.error
  const { paymentLink } = result
  const target = paymentLink.startsWith('http') ? paymentLink : new URL(paymentLink, req.url)
  log('GET redirecting', { orderId, target: target.toString() })
  return NextResponse.redirect(target)
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  let orderId = url.searchParams.get('orderId')
  log('POST create-link received', { queryOrderId: orderId })
  if (!orderId) {
    try {
      const body = await req.json()
      if (body && typeof body.orderId === 'string') {
        orderId = body.orderId
      }
    } catch {
      // ignore body parse errors
      console.warn(logPrefix, 'POST body parse failed')
    }
  }
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  const result = await resolvePaymentLink(orderId, req)
  if ('error' in result) return result.error
  const { paymentLink } = result
  const absoluteLink = paymentLink.startsWith('http') ? paymentLink : new URL(paymentLink, req.url).toString()
  log('POST returning link', { orderId, absoluteLink })
  return NextResponse.json({ redirectUrl: absoluteLink, url: absoluteLink })
}
