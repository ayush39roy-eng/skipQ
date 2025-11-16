import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  const link = `/pay/${order.id}`
  await prisma.payment.upsert({
    where: { orderId: order.id },
    update: { paymentLink: link, amountCents: order.totalCents },
    create: { orderId: order.id, amountCents: order.totalCents, paymentLink: link }
  })
  return NextResponse.redirect(new URL(link, req.url))
}
