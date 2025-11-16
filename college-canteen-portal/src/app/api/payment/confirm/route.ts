import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  await prisma.payment.update({ where: { orderId: order.id }, data: { status: 'PAID', paidAt: new Date() } })
  await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } })
  return NextResponse.redirect(new URL(`/order/${order.id}`, req.url))
}
