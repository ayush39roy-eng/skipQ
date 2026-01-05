import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRazorpaySignature } from '@/lib/razorpay'
import { markOrderAsPaid } from '@/lib/order-payment'
import { writeLog } from '@/lib/log-writer'

const logPrefix = '[RazorpayWebhook]'

function log(message: string, data?: Record<string, unknown>) {
  console.log(logPrefix, message, data)
  void writeLog('RazorpayWebhook', { message, data })
}

export async function POST(req: Request) {
  const raw = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  log('Received webhook', { signatureLength: signature?.length })

  if (!verifyRazorpaySignature(raw, signature || '')) {
    log('Invalid signature', { signature })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: { event: string, payload?: { payment?: { entity?: { id: string, order_id: string } }, order?: { entity?: { id: string } } } }
  try {
    payload = JSON.parse(raw)
  } catch (err) {
    log('Invalid JSON', { error: err })
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = payload.event
  log('Processing event', { event })

  const paymentEntity = payload.payload?.payment?.entity
  const orderEntity = payload.payload?.order?.entity

  // We are interested in payment.captured or order.paid
  if (event === 'payment.captured' || event === 'order.paid') {
    const externalOrderId = orderEntity?.id || paymentEntity?.order_id

    if (!externalOrderId) {
      log('Missing externalOrderId', { payload })
      return NextResponse.json({ ok: true }) // Idempotent
    }

    const payment = await prisma.payment.findFirst({ where: { externalOrderId } })
    if (!payment) {
      log('Payment not found for externalOrderId', { externalOrderId })
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    log('Found payment', { paymentId: payment.id, orderId: payment.orderId, currentStatus: payment.status })

    // Perform an atomic conditional update to avoid race conditions
    // Only set to PAID if it isn't already PAID. updateMany returns the number of rows modified.
    const updateResult = await prisma.payment.updateMany({
      where: { orderId: payment.orderId, status: { not: 'PAID' } },
      data: { status: 'PAID' }
    })

    // Capture user phone number if available in the payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contact = (paymentEntity as any)?.contact || (payload.payload?.payment?.entity as any)?.contact
    if (contact) {
      try {
        // Find the user associated with this order and update their phone
        const order = await prisma.order.findUnique({ where: { id: payment.orderId }, select: { userId: true } })
        if (order?.userId) {
          await prisma.user.update({
            where: { id: order.userId },
            data: { phone: contact }
          })
          log('Updated user phone from Razorpay contact', { userId: order.userId, contact })
        }
      } catch (err) {
        console.error('Failed to update user phone from webhook', err)
      }
    }

    if (updateResult.count > 0) {
      log('Payment status updated to PAID', { orderId: payment.orderId })
      // We successfully transitioned the payment to PAID; now perform downstream actions once.
      try {
        await markOrderAsPaid(payment.orderId)
        log('Order marked as PAID', { orderId: payment.orderId })
      } catch (err) {
        // Log the full error and identifiers for debugging/observability
        console.error('markOrderAsPaid failed', {
          error: err,
          orderId: payment.orderId,
          paymentId: payment.id,
          externalOrderId: payment.externalOrderId,
        })
        log('markOrderAsPaid failed', { error: err, orderId: payment.orderId })

        // Safely extract possible code/message from unknown `err` without using `any`.
        let code: string | undefined
        let message = ''
        if (err && typeof err === 'object') {
          const eObj = err as Record<string, unknown>
          if (typeof eObj.code === 'string') code = eObj.code
          if (typeof eObj.message === 'string') message = eObj.message
        }

        const unrecoverablePrismaCodes = ['P2002', 'P2025']
        const isUnrecoverable = (code && unrecoverablePrismaCodes.includes(code)) || /unique constraint/i.test(message)
        const isTransient = /timeout|ETIMEDOUT|ECONNRESET|EAI_AGAIN/i.test(message)

        if (isUnrecoverable) {
          // Acknowledge to avoid repeated retries for an unrecoverable situation.
          return NextResponse.json({ ok: true })
        }

        if (isTransient) {
          // Let provider retry by returning 500.
          return NextResponse.json({ error: 'Transient error, please retry' }, { status: 500 })
        }

        // Default: conservative — return 500 so provider may retry once.
        return NextResponse.json({ error: 'Processing error' }, { status: 500 })
      }
      log('Payment already PAID or handled', { orderId: payment.orderId })
      // Nothing to do — payment was already PAID or another process handled it.
      return NextResponse.json({ ok: true })
    }
  } else if (event === 'payment.failed') {
    const externalOrderId = orderEntity?.id || paymentEntity?.order_id
    if (!externalOrderId) return NextResponse.json({ ok: true })
    
    const payment = await prisma.payment.findFirst({ where: { externalOrderId } })
    if (!payment) return NextResponse.json({ ok: true })

    const errorEntity = (payload.payload?.payment?.entity as any)
    log('Payment Failed Webhook', { paymentId: payment.id, reason: errorEntity?.error_description })

    await prisma.payment.updateMany({
       where: { id: payment.id, status: { not: 'PAID' } },
       data: { status: 'FAILED' }
    })

    // Audit the failure
    const { logAudit } = await import('@/lib/audit')
    
    await logAudit({
      action: 'PAYMENT_FAILED',
      result: 'FAILED',
      severity: 'WARN',
      entityType: 'PAYMENT',
      entityId: payment.id,
      authType: 'SYSTEM',
      authId: 'razorpay-webhook',
      method: 'WEBHOOK',
      reqId: 'hook_' + Date.now(),
      ip: '0.0.0.0',
      metadata: { 
        reason: errorEntity?.error_description,
        code: errorEntity?.error_code
      }
    })
  }

  return NextResponse.json({ ok: true })
}
