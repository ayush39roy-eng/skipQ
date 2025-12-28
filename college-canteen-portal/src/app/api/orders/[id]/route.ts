import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          menuItem: true
        }
      },
      canteen: true,
      payment: true
    }
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = session.userId === order.userId
  const isAdmin = session.role === 'ADMIN'
  const isVendor = session.role === 'VENDOR' && session.user.vendorId === order.vendorId

  if (!isOwner && !isAdmin && !isVendor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    prepMinutes: order.prepMinutes ?? null,
    prepExtended: !!order.prepExtended,
    paymentStatus: order.payment?.status ?? null,
    updatedAt: order.updatedAt,
    createdAt: order.createdAt,
    fulfillmentType: order.fulfillmentType,
    items: order.items,
    canteen: order.canteen,
    payment: order.payment,
    totalCents: order.totalCents
  })
}