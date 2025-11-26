import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createRazorpayOrder } from '@/lib/razorpay'
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

import { getSession } from '@/lib/session'

async function resolvePaymentLink(orderId: string) {
  log('Resolving payment link', { orderId })

  // Security: Prevent spam by requiring login and ownership
  const session = await getSession()
  if (!session) {
    // If user is not authenticated, send them to signup first so they can complete payment.
    // Return a paymentLink that points to the registration flow with a `next` back to the payment page.
    console.warn(logPrefix, 'Unauthenticated access - redirecting to register', { orderId })
    const paymentLink = `/register?next=/pay/${orderId}`
    return { paymentLink }
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    ...orderInclude
  })
  if (!order) {
    console.warn(logPrefix, 'Order not found', { orderId })
    return { error: NextResponse.json({ error: 'Order not found' }, { status: 404 }) }
  }

  // Allow Admin or the Order Owner
  if (session.role !== 'ADMIN' && session.user.id !== order.userId) {
    console.warn(logPrefix, 'Forbidden access attempt', { orderId, userId: session.user.id })
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const hasRazorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  log('Razorpay check', { orderId, hasRazorpay: Boolean(hasRazorpay) })
  let paymentLink: string
  let externalOrderId: string | undefined

  if (hasRazorpay) {
    try {
      // Check if we already have a Razorpay order for this
      const existingPayment = await prisma.payment.findUnique({ where: { orderId: order.id } })
      if (existingPayment?.externalOrderId && existingPayment.provider === 'razorpay') {
        // Reuse existing Razorpay order id and payment link
        externalOrderId = existingPayment.externalOrderId
        paymentLink = `/pay/${order.id}`
      } else {
        // Create new Razorpay Order
        const rzpOrder = await createRazorpayOrder({
          orderId: order.id,
          amountCents: order.totalCents,
          currency: 'INR',
          notes: {
            userId: order.userId,
            userEmail: order.user.email
          }
        })
        externalOrderId = rzpOrder.id
        paymentLink = `/pay/${order.id}` // The frontend at /pay/[id] should fetch this orderId and open Razorpay
      }

      log('Razorpay order resolved', { orderId, externalOrderId })

      await prisma.payment.upsert({
        where: { orderId: order.id },
        update: { paymentLink, amountCents: order.totalCents, provider: 'razorpay', externalOrderId },
        create: { orderId: order.id, amountCents: order.totalCents, paymentLink, provider: 'razorpay', externalOrderId }
      })

    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown Razorpay error'
      // Log full error details server-side for debugging/observability
      console.error(logPrefix, 'Razorpay order failed', {
        orderId,
        detail,
        errorObj: error,
        keyIdPrefix: process.env.RAZORPAY_KEY_ID?.substring(0, 5)
      })
      // Return a generic error payload to the client to avoid leaking internals
      return { error: NextResponse.json({ error: 'Razorpay order failed', detail }, { status: 500 }) }
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
  const result = await resolvePaymentLink(orderId)
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
  const result = await resolvePaymentLink(orderId)
  if ('error' in result) return result.error
  const { paymentLink } = result
  const absoluteLink = paymentLink.startsWith('http') ? paymentLink : new URL(paymentLink, req.url).toString()
  log('POST returning link', { orderId, absoluteLink })
  return NextResponse.json({ redirectUrl: absoluteLink, url: absoluteLink })
}
