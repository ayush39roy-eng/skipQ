import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { InvoiceGenerator } from '@/lib/invoice-generator'

export const dynamic = 'force-dynamic'

/**
 * Generate Invoice for Settlement Batch
 * GET /api/admin/settlements/[id]/invoice
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
    
    // Fetch Settlement with Vendor
    const settlementBatch = await prisma.settlementBatch.findUnique({
      where: { id },
      include: {
        vendor: true
      }
    })

    if (!settlementBatch) {
      return NextResponse.json({ error: 'Settlement batch not found' }, { status: 404 })
    }

    // Fetch Platform Settings
    const settings = await prisma.platformSettings.findFirst()

    // Generate PDF
    const pdfBuffer = await InvoiceGenerator.generateInvoice(settlementBatch, settings)

    // Return PDF
    const filename = `invoice-${settlementBatch.id.substring(0,8)}.pdf`
    
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('[INVOICE-API] Error generating invoice:', error)
    return NextResponse.json({ 
      error: 'Failed to generate invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
