import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * List Vendors
 * GET /api/admin/vendors
 */
export async function GET(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        mode: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Calculate stats for each vendor
    const vendorsWithStats = await Promise.all(
      vendors.map(async (vendor) => {
        // Count orders
        const orderCount = await prisma.order.count({
          where: { vendorId: vendor.id }
        })

        // Get total GMV from ledger
        const ledgerSum = await prisma.ledgerEntry.aggregate({
          where: {
            vendorId: vendor.id,
            type: 'SALE'
          },
          _sum: {
            grossAmount: true
          }
        })

        // Get last settlement date
        let lastSettlementDate = null
        try {
          const lastSettlement = await prisma.settlementBatch.findFirst({
            where: { vendorId: vendor.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
          })
          lastSettlementDate = lastSettlement?.createdAt?.toISOString() || null
        } catch (e) {
          // Settlement batch might not have any records yet
        }

        return {
          id: vendor.id,
          name: vendor.name,
          status: 'ACTIVE', // Default since status field doesn't exist
          mode: vendor.mode,
          totalOrders: orderCount,
          totalGMV: ledgerSum._sum.grossAmount || 0,
          lastSettlementDate
        }
      })
    )

    return NextResponse.json({
      vendors: vendorsWithStats,
      count: vendorsWithStats.length
    })

  } catch (error) {
    console.error('[ADMIN-VENDORS] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch vendors',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
