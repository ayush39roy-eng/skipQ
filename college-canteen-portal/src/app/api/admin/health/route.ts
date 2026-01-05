import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * System Health (Stub)
 * GET /api/admin/health
 */
export async function GET(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const timestamp = new Date().toISOString()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // 1. Database & Payment Gateway Status (Simulated via DB Connectivity)
    let dbStatus = 'OPERATIONAL'
    try {
      // Simple read check
      await prisma.user.findFirst({ select: { id: true } })
    } catch (e) {
      dbStatus = 'DOWN'
      console.error('DB Health Check Failed:', e)
    }

    // 2. Order Metrics (Last Hour)
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: oneHourAgo }
      },
      select: { status: true }
    })

    const totalOrdersLastHour = recentOrders.length
    const failedOrders = recentOrders.filter(o => o.status === 'FAILED' || o.status === 'CANCELLED').length
    const failureRate = totalOrdersLastHour > 0 ? failedOrders / totalOrdersLastHour : 0

    // 3. Reconciliation Status
    let reconciliationStatus = 'PASS'
    try {
      // Run a quick check for today
      const { FinancialReportingService } = await import('@/app/vendor/services/financial-reporting-service')
      const reconciliation = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        return await FinancialReportingService.generateReconciliationReport(tx, {
          dateRange: {
            start: twentyFourHoursAgo,
            end: new Date()
          }
        })
      })
      reconciliationStatus = reconciliation.overallStatus
    } catch (e) {
      reconciliationStatus = 'FAIL'
      console.error('Reconciliation Check Failed:', e)
    }

    // 4. Recent Errors (From Audit Log)
    // We assume 'FAILURE' result in AuditLog indicates a system error for now
    const errorsRaw = await prisma.auditLog.findMany({
      where: {
        timestamp: { gte: twentyFourHoursAgo },
        result: 'FAILURE'
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    })

    const recentErrors = errorsRaw.map(e => ({
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      type: e.action, // using action as type
      message: `Failed: ${e.method} ${e.action} by ${e.authId || 'Unknown'}`,
      count: 1 // Grouping not implemented yet, simpler listing
    }))

    const health = {
      paymentGateway: {
        status: dbStatus === 'OPERATIONAL' ? 'OPERATIONAL' : 'DOWN', // Proxying for now
        lastChecked: timestamp
      },
      webhooks: {
        averageDelay: 120, // Still mocked as we don't track this yet
        failedLast24h: 0
      },
      orders: {
        failureRate,
        lastHour: totalOrdersLastHour
      },
      reconciliation: {
        status: reconciliationStatus,
        lastRun: timestamp
      }
    }

    return NextResponse.json({ health, recentErrors })

  } catch (error) {
    console.error('[ADMIN-HEALTH] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch health',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
