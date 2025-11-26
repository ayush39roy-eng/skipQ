import { NextResponse } from 'next/server'
import { markOrderAsPaid } from '@/lib/order-payment'
import { prisma } from '@/lib/prisma'
import { getRazorpayOrder, getRazorpayPayment } from '@/lib/razorpay'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

  try {
    // SECURITY FIX: Verify with Razorpay before marking as paid
    const payment = await prisma.payment.findUnique({ where: { orderId } })
    if (!payment || !payment.externalOrderId) {
      // If no payment record or external ID, we can't verify. 
      // It might be a manual payment, but this route is usually for online flow.
      // Just redirect to order page.
      console.warn('Payment confirm: No payment record found', { orderId })
    } else {
      // Fetch order status from Razorpay
      const rzpOrder = await getRazorpayOrder(payment.externalOrderId)
      if (!rzpOrder) {
        console.warn('Payment confirm: Razorpay order not found', { orderId, externalOrderId: payment.externalOrderId })
      } else if (rzpOrder.status !== 'paid') {
        console.warn('Payment confirm: Razorpay order not paid', { orderId, externalOrderId: payment.externalOrderId, status: rzpOrder.status })
      } else {
        // rzpOrder exists and is paid - perform final verification using the specific payment record
        const paymentId = searchParams.get('razorpay_payment_id')
        if (!paymentId) {
          console.warn('Payment confirm: missing razorpay_payment_id in callback', { orderId, externalOrderId: payment.externalOrderId })
        } else {
          const rzpPayment = await getRazorpayPayment(paymentId)
          if (!rzpPayment) {
            console.warn('Payment confirm: Razorpay payment not found', { orderId, paymentId })
          } else if (rzpPayment.order_id !== payment.externalOrderId || rzpPayment.status !== 'captured') {
            console.warn('Payment confirm mismatch', {
              orderId,
              expectedRazorpayOrderId: payment.externalOrderId,
              actualRazorpayOrderId: rzpPayment.order_id,
              status: rzpPayment.status
            })
          } else {
            // All checks passed; mark the order as paid once
            await markOrderAsPaid(orderId)
          }
        }
      }
    }
  } catch (error) {
    console.error('Payment confirm failed', { orderId, error })
    // We don't return 500, we just redirect to order page which will show pending status
  }

  return NextResponse.redirect(new URL(`/order/${orderId}`, req.url))
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const orderId = typeof body.orderId === 'string' ? body.orderId : undefined
    const paymentId = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id : undefined
    const razorpayOrderId = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id : undefined

    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

    // SECURITY: verify with Razorpay before marking as paid
    const payment = await prisma.payment.findUnique({ where: { orderId } })
    if (!payment || !payment.externalOrderId) {
      console.warn('Payment confirm (POST): No payment record found', { orderId })
      return NextResponse.json({ ok: false, message: 'No payment record' })
    }

    // If client provided a razorpay_order_id, ensure it matches our stored externalOrderId
    if (razorpayOrderId && razorpayOrderId !== payment.externalOrderId) {
      console.warn('Payment confirm (POST): client provided mismatched razorpay_order_id', { orderId, razorpayOrderId, expected: payment.externalOrderId })
      // continue verification against stored externalOrderId below
    }

    // Prefer verifying the payment record if client provided a payment id
    if (paymentId) {
      const rzpPayment = await getRazorpayPayment(paymentId)
      if (!rzpPayment) {
        console.warn('Payment confirm (POST): Razorpay payment not found', { orderId, paymentId })
        return NextResponse.json({ ok: false, message: 'Razorpay payment not found' })
      }

      if (rzpPayment.order_id !== payment.externalOrderId || rzpPayment.status !== 'captured') {
        console.warn('Payment confirm (POST) mismatch', {
          orderId,
          expectedRazorpayOrderId: payment.externalOrderId,
          actualRazorpayOrderId: rzpPayment.order_id,
          status: rzpPayment.status,
        })
        return NextResponse.json({ ok: false, message: 'Payment verification failed' })
      }

      // All checks passed; mark the order as paid once
      await markOrderAsPaid(orderId)
      return NextResponse.json({ ok: true })
    }

    // Fallback: verify the Razorpay order status
    const rzpOrder = await getRazorpayOrder(payment.externalOrderId)
    if (!rzpOrder) {
      console.warn('Payment confirm (POST): Razorpay order not found', { orderId, externalOrderId: payment.externalOrderId })
      return NextResponse.json({ ok: false, message: 'Razorpay order not found' })
    }

    if (rzpOrder.status !== 'paid') {
      console.warn('Payment confirm (POST): Razorpay order not paid', { orderId, externalOrderId: payment.externalOrderId, status: rzpOrder.status })
      return NextResponse.json({ ok: false, message: 'Razorpay order not paid' })
    }

    // If we reached here, order is paid according to Razorpay
    await markOrderAsPaid(orderId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Payment confirm (POST) failed', { error })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
