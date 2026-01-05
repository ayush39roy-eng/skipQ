import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Get Dashboard Metrics
 * GET /api/admin/dashboard
 */
export async function GET() {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Orders today
    const ordersToday = await prisma.order.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    // Revenue today (sum of platform fees from PAID orders)
    const ordersWithRevenue = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        status: 'PAID'
      },
      select: {
        commissionCents: true
      }
    })
    const revenueToday = ordersWithRevenue.reduce((sum, order) => sum + order.commissionCents, 0)

    // Pending liabilities (unsettled vendor receivables)
    const unsettledLedger = await prisma.ledgerEntry.aggregate({
      where: {
        settlementStatus: 'UNSETTLED'
      },
      _sum: {
        netAmount: true
      }
    })
    const pendingLiabilities = unsettledLedger._sum.netAmount || 0

    // Failed payments in last 24 hours (via orders with failed payments)
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)
    
    const failedPayments = await prisma.order.count({
      where: {
        payment: {
          status: 'FAILED'
        },
        createdAt: {
          gte: yesterday
        }
      }
    })



    // Pending settlements (batches not exported)
    const pendingSettlements = await prisma.settlementBatch.count({
      where: {
        status: 'CREATED'
      }
    })

    // Generate alerts based on metrics
    const alerts: Array<{
      id: string
      type: 'error' | 'warning' | 'info'
      message: string
      timestamp: string
    }> = []

    if (failedPayments > 0) {
      alerts.push({
        id: 'failed-payments',
        type: 'error',
        message: `${failedPayments} failed payment(s) in last 24 hours`,
        timestamp: new Date().toISOString()
      })
    }

    if (pendingSettlements > 0) {
      alerts.push({
        id: 'pending-settlements',
        type: 'warning',
        message: `${pendingSettlements} settlement batch(es) ready for export`,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      metrics: {
        ordersToday,
        revenueToday,
        pendingLiabilities,
        failedPayments,
        pendingRefunds: 0, // Feature not implemented yet
        pendingSettlements
      },
      alerts
    })

  } catch (error) {
    console.error('[ADMIN-DASHBOARD] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
