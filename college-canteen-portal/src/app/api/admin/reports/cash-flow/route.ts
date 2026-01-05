import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { FinancialReportingService } from '@/app/vendor/services/financial-reporting-service'
import { FinancialExportUtility } from '@/lib/financial-export'

export const dynamic = 'force-dynamic'

/**
 * Cash Flow Report
 * GET /api/admin/reports/cash-flow?start=...&end=...&export=csv
 */
export async function GET(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const exportFormat = searchParams.get('export')

    if (!start || !end) {
      return NextResponse.json({ 
        error: 'Missing required parameters: start and end dates' 
      }, { status: 400 })
    }

    const dateRange = {
      start: new Date(start),
      end: new Date(end)
    }

    const filters = { dateRange }

    const report = await prisma.$transaction(async (tx) => {
      return await FinancialReportingService.generateCashFlowReport(tx, filters)
    })

    console.log('[CASHFLOW-REPORT] Generated:', {
      dateRange,
      adminUserId: session.userId
    })

    if (exportFormat === 'csv') {
      const csv = FinancialExportUtility.exportCashFlowCSV(report, {
        dateRange,
        filters: 'None'
      })

      // Audit Log
      const { logAudit } = await import('@/lib/audit')
      const { getRequestId, getClientIp } = await import('@/lib/request-context')
      
      await logAudit({
        action: 'REPORT_EXPORTED',
        result: 'SUCCESS',
        severity: 'WARN',
        entityType: 'SYSTEM',
        entityId: 'cash-flow-report',
        authType: 'SESSION',
        authId: session.userId,
        method: 'GET',
        reqId: await getRequestId(),
        ip: await getClientIp(),
        metadata: { reportType: 'CASH_FLOW', dateRange, format: 'csv' }
      })

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="cash-flow-${start}-${end}.csv"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }

    return NextResponse.json({
      report,
      filters,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[CASHFLOW-REPORT] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate cash flow report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
