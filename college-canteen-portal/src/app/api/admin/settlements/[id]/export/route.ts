import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { SettlementExportUtility } from '@/lib/settlement-export'
import { SettlementService } from '@/app/vendor/services/settlement-service'

export const dynamic = 'force-dynamic'

/**
 * Export Settlement Batch as CSV/Excel
 * GET /api/admin/settlements/[id]/export?format=summary|detailed|combined|bank|excel
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
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'bank'

    // Fetch settlement batch with all relations including full order details
    const settlementBatch = await prisma.settlementBatch.findUnique({
      where: { id },
      include: {
        vendor: true,
        ledgerEntries: {
          include: {
            order: {
              include: {
                items: {
                  include: {
                    menuItem: {
                      select: {
                        name: true,
                        priceCents: true
                      }
                    }
                  }
                },
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    })

    if (!settlementBatch) {
      return NextResponse.json({ error: 'Settlement batch not found' }, { status: 404 })
    }

    // Generate export based on format
    let contentString: string
    let filename: string
    let contentType: string

    switch (format) {
      case 'excel':
        contentString = SettlementExportUtility.generateExcelCSV(settlementBatch as any)
        filename = `settlement-${settlementBatch.vendor.name}-${settlementBatch.id.substring(0,8)}.csv`
        contentType = 'text/csv; charset=utf-8'
        break
      case 'summary':
        contentString = SettlementExportUtility.generateSummaryCSV(settlementBatch as any)
        filename = `settlement-summary-${settlementBatch.id}.csv`
        contentType = 'text/csv; charset=utf-8'
        break
      case 'detailed':
        contentString = SettlementExportUtility.generateDetailedCSV(settlementBatch as any)
        filename = `settlement-detailed-${settlementBatch.id}.csv`
        contentType = 'text/csv; charset=utf-8'
        break
      case 'combined':
        contentString = SettlementExportUtility.generateCombinedCSV(settlementBatch as any)
        filename = `settlement-combined-${settlementBatch.id}.csv`
        contentType = 'text/csv; charset=utf-8'
        break
      case 'bank':
      default:
        contentString = SettlementExportUtility.generateBankReadyCSV(settlementBatch as any)
        filename = `settlement-bank-${settlementBatch.id}.csv`
        contentType = 'text/csv; charset=utf-8'
    }

    // Mark as exported in transaction
    await prisma.$transaction(async (tx) => {
      await SettlementService.markAsExported(tx, settlementBatch.id)
    })

    // Audit Log (Gold Standard)
    const { logAudit } = await import('@/lib/audit')
    const { getRequestId, getClientIp } = await import('@/lib/request-context')

    await logAudit({
      action: 'SETTLEMENT_EXPORTED',
      result: 'SUCCESS',
      severity: 'WARN', // Warn because it's sensitive financial data export
      entityType: 'SETTLEMENT',
      entityId: settlementBatch.id,
      authType: 'SESSION',
      authId: session.userId,
      method: 'GET',
      reqId: await getRequestId(),
      ip: await getClientIp(),
      metadata: { 
        format, 
        vendorId: settlementBatch.vendorId,
        filename
      }
    })

    console.log('[SETTLEMENT-EXPORT] Export generated:', {
      batchId: settlementBatch.id,
      format,
      vendorId: settlementBatch.vendorId,
      exportedBy: session.userId
    })

    // Return file with BOM for Excel UTF-8 compatibility
    return new NextResponse(`\uFEFF${contentString}`, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('[SETTLEMENT-EXPORT] Error exporting settlement:', error)
    return NextResponse.json({ 
      error: 'Failed to export settlement',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
