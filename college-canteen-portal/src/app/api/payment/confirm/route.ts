import { NextResponse } from 'next/server'
import { markOrderAsPaid } from '@/lib/order-payment'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  try {
    await markOrderAsPaid(orderId)
  } catch (error) {
    console.error('Payment confirm failed', { orderId, error })
    return NextResponse.json({ error: 'Unable to confirm order' }, { status: 500 })
  }
  return NextResponse.redirect(new URL(`/order/${orderId}`, req.url))
}
