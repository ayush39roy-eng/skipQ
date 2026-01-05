import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Get Order Detail
 * GET /api/admin/orders/[id]
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { name: true, phone: true }
        },
        user: {
          select: { name: true, phone: true }
        },
        items: {
          include: {
            menuItem: {
              select: { name: true }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({
      order: {
        ...order,
        createdAt: order.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('[ADMIN-ORDER-DETAIL] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch order',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
