import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

export async function POST(req: Request) {
  const session = await requireRole(['VENDOR'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const orderId = String(form.get('orderId') ?? '')
  const action = String(form.get('action') ?? '')
  const prepMinutes = form.get('prepMinutes') ? Number(form.get('prepMinutes')) : undefined

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.vendorId !== session.user.vendorId) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (action === 'CONFIRM') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED' } })
  } else if (action === 'CANCELLED') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } })
  } else if (action === 'SET_PREP' && typeof prepMinutes === 'number' && !Number.isNaN(prepMinutes)) {
    await prisma.order.update({ where: { id: orderId }, data: { prepMinutes } })
  }

  return NextResponse.redirect(new URL('/vendor', req.url))
}
