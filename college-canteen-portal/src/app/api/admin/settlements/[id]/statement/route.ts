import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { PayoutStatementGenerator } from '@/lib/payout-statement-generator'
import { logAudit } from '@/lib/audit'
import { getRequestId, getClientIp } from '@/lib/request-context'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settlements/[id]/statement?format=pdf|csv
 * 
 * Generates official Vendor Payout Statement.
 * format: 'pdf' (default) or 'csv'
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'pdf'

  try {
    // 1. Fetch Settlement with Vendor & Ledger Entries
    const settlement = await prisma.settlementBatch.findUnique({
      where: { id },
      include: {
        vendor: true,
        ledgerEntries: {
          orderBy: { timestamp: 'desc' },
          where: { type: { in: ['SALE', 'REFUND'] } } // Only customer transactions
        }
      }
    })

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    // 2. Generate File
    let fileBuffer: Buffer
    let contentType: string
    let filename: string

    if (format === 'csv') {
      const csvString = PayoutStatementGenerator.generateCSV(settlement)
      fileBuffer = Buffer.from(csvString)
      contentType = 'text/csv'
      filename = `Payout_Statement_${settlement.id.substring(0,8)}.csv`
    } else {
      // PDF Default
      const pdfBytes = PayoutStatementGenerator.generatePDF(settlement)
      fileBuffer = Buffer.from(pdfBytes)
      contentType = 'application/pdf'
      filename = `Payout_Statement_${settlement.id.substring(0,8)}.pdf`
    }

    // 3. Audit Log
    await logAudit({
      action: 'EXPORT_PAYOUT_STATEMENT',
      result: 'ALLOWED',
      severity: 'INFO',
      entityType: 'SETTLEMENT',
      entityId: id,
      authType: 'SESSION',
      authId: session.userId,
      method: 'GET',
      reqId: await getRequestId(),
      ip: await getClientIp(),
      metadata: { format, vendorId: settlement.vendorId }
    })

    // 4. Return File
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('[PAYOUT_STATEMENT_ERROR]', error)
    return NextResponse.json({ error: 'Failed to generate statement' }, { status: 500 })
  }
}
