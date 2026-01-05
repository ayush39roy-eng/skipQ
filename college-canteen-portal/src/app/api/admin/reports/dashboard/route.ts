import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { FinancialReportingService } from '@/app/vendor/services/financial-reporting-service'
import { FinancialExportUtility } from '@/lib/financial-export'

export const dynamic = 'force-dynamic'

/**
 * Combined Financial Dashboard  
 * GET /api/admin/reports/dashboard?start=...&end=...
 * 
 * Returns all key financial metrics in one response.
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

    // Generate all reports in parallel within transaction
    const reports = await prisma.$transaction(async (tx) => {
      const [revenue, gst, cashFlow, vendorLiability, reconciliation] = await Promise.all([
        FinancialReportingService.generateRevenueReport(tx, filters),
        FinancialReportingService.generateGSTLiabilityReport(tx, filters),
        FinancialReportingService.generateCashFlowReport(tx, filters),
        FinancialReportingService.generateVendorLiabilityReport(tx, filters),
        FinancialReportingService.generateReconciliationReport(tx, filters)
      ])

      return {
        revenue,
        gst,
        cashFlow,
        vendorLiability,
        reconciliation
      }
    })

    console.log('[DASHBOARD] Generated:', {
      dateRange,
      adminUserId: session.userId,
      reconciliationStatus: reports.reconciliation.overallStatus
    })

    return NextResponse.json({
      ...reports,
      filters,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DASHBOARD] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
