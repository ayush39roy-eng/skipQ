import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { SettlementService } from '@/app/vendor/services/settlement-service'

export const dynamic = 'force-dynamic'

/**
 * Generate Settlement Batch
 * POST /api/admin/settlements/generate
 * 
 * Admin-only endpoint to generate a settlement batch for a vendor.
 */
export async function POST(req: Request) {
  // Only admins can generate settlements
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { vendorId, periodStartDate, periodEndDate } = body

    // Validate inputs
    if (!vendorId || !periodStartDate || !periodEndDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: vendorId, periodStartDate, periodEndDate' 
      }, { status: 400 })
    }

    const startDate = new Date(periodStartDate)
    const endDate = new Date(periodEndDate)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    if (startDate >= endDate) {
      return NextResponse.json({ 
        error: 'Period start date must be before end date' 
      }, { status: 400 })
    }

    // Generate settlement in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check for overlapping settlements
      const hasOverlap = await SettlementService.hasOverlappingSettlement(
        tx,
        vendorId,
        startDate,
        endDate
      )

      if (hasOverlap) {
        throw new Error('Date range overlaps with existing settlement batch')
      }

      // Generate settlement
      return await SettlementService.generateSettlement(tx, {
        vendorId,
        periodStartDate: startDate,
        periodEndDate: endDate,
        createdByUserId: session.userId
      })
    })

    // Audit Log (Gold Standard)
    const { logAudit } = await import('@/lib/audit')
    const { getRequestId, getClientIp } = await import('@/lib/request-context')

    await logAudit({
      action: 'SETTLEMENT_CREATED', 
      result: 'SUCCESS',
      severity: 'CRITICAL',
      entityType: 'SETTLEMENT',
      entityId: result.settlementBatch.id,
      authType: 'SESSION',
      authId: session.userId,
      method: 'POST',
      reqId: await getRequestId(),
      ip: await getClientIp(),
      after: result.settlementBatch,
      metadata: { 
        vendorId, 
        periodStartDate, 
        periodEndDate,
        settledEntriesCount: result.settledEntriesCount 
      }
    })

    console.log('[SETTLEMENT-API] Batch generated:', {
      batchId: result.settlementBatch.id,
      vendorId,
      entriesSettled: result.settledEntriesCount,
      adminUserId: session.userId
    })

    return NextResponse.json({
      success: true,
      settlementBatch: result.settlementBatch,
      settledEntriesCount: result.settledEntriesCount,
      message: `Settlement batch created. ${result.settledEntriesCount} ledger entries settled.`
    })

  } catch (error) {
    console.error('[SETTLEMENT-API] Error generating settlement:', error)
    return NextResponse.json({ 
      error: 'Failed to generate settlement',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * List Settlement Batches
 * GET /api/admin/settlements?vendorId=xxx
 */
export async function GET(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const vendorId = searchParams.get('vendorId')

    const where = vendorId ? { vendorId } : {}

    const batches = await prisma.settlementBatch.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            ledgerEntries: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      batches,
      count: batches.length
    })

  } catch (error) {
    console.error('[SETTLEMENT-API] Error listing settlements:', error)
    return NextResponse.json({ 
      error: 'Failed to list settlements',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
