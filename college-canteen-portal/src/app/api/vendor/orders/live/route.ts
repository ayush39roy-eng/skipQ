import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await requireRole(['VENDOR'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const vendorId = session.user.vendorId
  if (!vendorId) return NextResponse.json({ error: 'Vendor not linked' }, { status: 400 })

  const orders = await prisma.order.findMany({
    where: {
      vendorId,
      status: { in: ['PAID', 'CONFIRMED', 'READY'] }
    },
    include: {
      canteen: true,
      user: { select: { name: true } },
      items: { include: { menuItem: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({ orders })
}
