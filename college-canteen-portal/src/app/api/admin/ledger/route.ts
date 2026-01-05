import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Ledger Entries
 * GET /api/admin/ledger
 */
export async function GET(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const vendorId = searchParams.get('vendorId')
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const settlementStatus = searchParams.get('settlementStatus')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    
    if (vendorId) where.vendorId = vendorId
    if (start && end) {
      where.timestamp = {
        gte: new Date(start),
        lte: new Date(end)
      }
    }
    if (settlementStatus) where.settlementStatus = settlementStatus
    if (type) where.type = type

    // Get total count
    const totalCount = await prisma.ledgerEntry.count({ where })

    // Get paginated entries
    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: {
        vendor: {
          select: { name: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    })

    const formattedEntries = entries.map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      vendorId: entry.vendorId,
      vendorName: entry.vendor?.name || 'Unknown',
      type: entry.type,
      grossAmount: entry.grossAmount,
      taxAmount: entry.taxAmount,
      platformFee: entry.platformFee,
      netAmount: entry.netAmount,
      settlementStatus: entry.settlementStatus,
      settlementBatchId: entry.settlementBatchId
    }))

    return NextResponse.json({ 
      entries: formattedEntries,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('[ADMIN-LEDGER] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch ledger entries',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
