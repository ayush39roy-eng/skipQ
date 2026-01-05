import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { FinancialReportingService } from '@/app/vendor/services/financial-reporting-service'
import { FinancialExportUtility } from '@/lib/financial-export'

export const dynamic = 'force-dynamic'

/**
 * GST Liability Report
 * GET /api/admin/reports/gst-liability?start=...&end=...&export=csv
 * 
 * COMPLIANCE-CRITICAL: Platform fee GST only, excludes vendor food GST.
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

    // Fetch platform settings for GST rate
    const settings = await prisma.platformSettings.findFirst()
    const gstRate = settings?.platformGstRate || 18

    const report = await prisma.$transaction(async (tx) => {
      return await FinancialReportingService.generateGSTLiabilityReport(tx, filters, gstRate)
    })

    console.log('[GST-REPORT] Generated:', {
      dateRange,
      adminUserId: session.userId,
      gstCollected: report.platformFeeGSTCollected,
      effectiveGstRate: gstRate
    })

    if (exportFormat === 'csv') {
      const csv = FinancialExportUtility.exportGSTLiabilityCSV(report, {
        dateRange,
        filters: `GST Rate: ${gstRate}%`
      })

      // Audit Log
      const { logAudit } = await import('@/lib/audit')
      const { getRequestId, getClientIp } = await import('@/lib/request-context')
      
      await logAudit({
        action: 'REPORT_EXPORTED',
        result: 'SUCCESS',
        severity: 'WARN',
        entityType: 'SYSTEM',
        entityId: 'gst-liability-report',
        authType: 'SESSION',
        authId: session.userId,
        method: 'GET',
        reqId: await getRequestId(),
        ip: await getClientIp(),
        metadata: { reportType: 'GST_LIABILITY', dateRange, format: 'csv' }
      })

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="gst-liability-${start}-${end}.csv"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }

    return NextResponse.json({
      report,
      filters,
      effectiveGstRate: gstRate,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[GST-REPORT] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate GST liability report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
