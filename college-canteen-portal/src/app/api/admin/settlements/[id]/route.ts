import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { SettlementExportUtility } from '@/lib/settlement-export'
import { SettlementService } from '@/app/vendor/services/settlement-service'

export const dynamic = 'force-dynamic'

/**
 * Get Settlement Batch Details
 * GET /api/admin/settlements/[id]
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
    
    const settlementBatch = await prisma.settlementBatch.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { name: true }
        },
        ledgerEntries: {
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    })

    if (!settlementBatch) {
      return NextResponse.json({ error: 'Settlement batch not found' }, { status: 404 })
    }

    return NextResponse.json({
      settlement: {
        ...settlementBatch,
        vendorName: settlementBatch.vendor.name,
        periodStartDate: settlementBatch.periodStartDate.toISOString(),
        periodEndDate: settlementBatch.periodEndDate.toISOString(),
        createdAt: settlementBatch.createdAt.toISOString(),
        exportedAt: settlementBatch.exportedAt?.toISOString() || null,
        ledgerEntries: settlementBatch.ledgerEntries.map(entry => ({
          ...entry,
          timestamp: entry.timestamp.toISOString()
        }))
      }
    })

  } catch (error) {
    console.error('[SETTLEMENT-API] Error fetching settlement:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch settlement',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
