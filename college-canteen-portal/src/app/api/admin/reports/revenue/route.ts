import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { FinancialReportingService } from '@/app/vendor/services/financial-reporting-service'
import { FinancialExportUtility } from '@/lib/financial-export'

export const dynamic = 'force-dynamic'

/**
 * Company Revenue Report
 * GET /api/admin/reports/revenue?start=...&end=...&vendorId=...&export=csv
 * 
 * Admin-only endpoint for platform revenue analysis.
 */
export async function GET(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    
    // Parse filters
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const vendorId = searchParams.get('vendorId') || undefined
    const orderType = searchParams.get('orderType') || undefined
    const settlementStatus = searchParams.get('settlementStatus') as 'SETTLED' | 'UNSETTLED' | undefined
    const exportFormat = searchParams.get('export')

    // Validate date range
    if (!start || !end) {
      return NextResponse.json({ 
        error: 'Missing required parameters: start and end dates' 
      }, { status: 400 })
    }

    const dateRange = {
      start: new Date(start),
      end: new Date(end)
    }

    if (isNaN(dateRange.start.getTime()) || isNaN(dateRange.end.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    const filters = {
      dateRange,
      vendorId,
      orderType,
      settlementStatus
    }

    // Fetch platform settings for GST rate
    const settings = await prisma.platformSettings.findFirst()
    const gstRate = settings?.platformGstRate || 18

    // Generate report
    const report = await prisma.$transaction(async (tx) => {
      return await FinancialReportingService.generateRevenueReport(tx, filters, gstRate)
    })

    console.log('[REVENUE-REPORT] Generated:', {
      dateRange,
      filters: { vendorId, orderType, settlementStatus },
      adminUserId: session.userId,
      grossFees: report.grossPlatformFees,
      effectiveGstRate: gstRate
    })

    // Export as CSV if requested
    if (exportFormat === 'csv') {
      const filtersStr = [vendorId && `vendorId=${vendorId}`, orderType && `orderType=${orderType}`, settlementStatus && `settlementStatus=${settlementStatus}`]
        .filter(Boolean)
        .join(', ') || 'None'

      const csv = FinancialExportUtility.exportRevenueCSV(report, {
        dateRange,
        filters: filtersStr
      })

      // Audit Log
      const { logAudit } = await import('@/lib/audit')
      const { getRequestId, getClientIp } = await import('@/lib/request-context')
      
      await logAudit({
        action: 'REPORT_EXPORTED',
        result: 'SUCCESS',
        severity: 'WARN',
        entityType: 'SYSTEM',
        entityId: 'revenue-report',
        authType: 'SESSION',
        authId: session.userId,
        method: 'GET',
        reqId: await getRequestId(),
        ip: await getClientIp(),
        metadata: { reportType: 'REVENUE', dateRange, format: 'csv' }
      })

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="revenue-report-${start}-${end}.csv"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }

    // Return JSON
    return NextResponse.json({
      report,
      filters,
      effectiveGstRate: gstRate,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[REVENUE-REPORT] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate revenue report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
