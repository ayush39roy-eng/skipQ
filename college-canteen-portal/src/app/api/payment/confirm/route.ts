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
      if (rzpOrder.status === 'paid') {
        await markOrderAsPaid(orderId)
        const paymentId = searchParams.get('razorpay_payment_id')
        if (paymentId) {
          const rzpPayment = await getRazorpayPayment(paymentId)
          // SECURITY: Verify that this payment actually belongs to the order we are confirming
          if (rzpPayment.order_id === payment.externalOrderId && rzpPayment.status === 'captured') {
            await markOrderAsPaid(orderId)
          } else {
            console.warn('Payment confirm mismatch', {
              orderId,
              expectedRazorpayOrderId: payment.externalOrderId,
              actualRazorpayOrderId: rzpPayment.order_id,
              status: rzpPayment.status
            })
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
