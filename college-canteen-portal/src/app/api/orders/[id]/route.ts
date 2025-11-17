import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireRole(['USER','VENDOR','ADMIN'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { payment: true } })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    id: order.id,
    status: order.status,
    prepMinutes: order.prepMinutes ?? null,
    paymentStatus: order.payment?.status ?? null,
    updatedAt: order.updatedAt,
  })
}