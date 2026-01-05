import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * List Settlement Batches
 * GET /api/admin/settlements
 */
export async function GET(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const batches = await prisma.settlementBatch.findMany({
      include: {
        vendor: {
          select: { name: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    })

    const formattedBatches = batches.map(batch => ({
      id: batch.id,
      vendorId: batch.vendorId,
      vendorName: batch.vendor.name,
      periodStartDate: batch.periodStartDate.toISOString(),
      periodEndDate: batch.periodEndDate.toISOString(),
      totalVendorPayable: batch.totalVendorPayable,
      totalOrders: batch.totalOrders,
      status: batch.status,
      createdAt: batch.createdAt.toISOString()
    }))

    return NextResponse.json({
      batches: formattedBatches,
      count: formattedBatches.length
    })

  } catch (error) {
    console.error('[ADMIN-SETTLEMENTS] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch settlement batches',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
