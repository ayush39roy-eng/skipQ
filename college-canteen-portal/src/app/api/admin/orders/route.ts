import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * List Orders
 * GET /api/admin/orders
 */
export async function GET(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const vendorId = searchParams.get('vendorId')
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const orderType = searchParams.get('orderType')
    const paymentStatus = searchParams.get('paymentStatus')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    
    if (vendorId) where.vendorId = vendorId
    if (start && end) {
      where.createdAt = {
        gte: new Date(start),
        lte: new Date(end)
      }
    }
    if (orderType) where.orderType = orderType
    if (paymentStatus) where.status = paymentStatus

    // Get total count
    const totalCount = await prisma.order.count({ where })

    // Get paginated orders
    const orders = await prisma.order.findMany({
      where,
      include: {
        vendor: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    const formattedOrders = orders.map(order => ({
      id: order.id,
      createdAt: order.createdAt.toISOString(),
      vendorId: order.vendorId,
      vendorName: order.vendor?.name || 'Unknown',
      userPaid: order.totalCents,
      platformFee: order.commissionCents,
      vendorReceivable: order.vendorTakeCents,
      orderType: (order as any).orderType || 'SELF_ORDER',
      paymentStatus: order.status,
      refundStatus: (order as any).refundStatus || 'NONE'
    }))

    return NextResponse.json({ 
      orders: formattedOrders,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('[ADMIN-ORDERS] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
