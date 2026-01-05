import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { LedgerService } from '@/app/vendor/services/ledger-service'

export const dynamic = 'force-dynamic'

/**
 * Refund API Endpoint
 * POST /api/orders/[id]/refund
 * 
 * Handles full and partial order refunds with:
 * - Ledger entry creation (negative values)
 * - Order status update
 * - Payment status update
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only admins and vendors can issue refunds
  const session = await requireRole(['ADMIN', 'VENDOR'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const paramsValue = await params
    const orderId = paramsValue.id
    const body = await req.json()
    const reason = typeof body.reason === 'string' ? body.reason : 'Refund requested'
    const refundAmount = typeof body.refundAmount === 'number' ? body.refundAmount : null

    // Fetch order with payment details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Validate order is refundable
    if (order.status === 'REFUNDED') {
      return NextResponse.json({ error: 'Order already refunded' }, { status: 400 })
    }

    if (!order.payment || order.payment.status !== 'PAID') {
      return NextResponse.json({ 
        error: 'Cannot refund unpaid order' 
      }, { status: 400 })
    }

    // Determine refund amount (full vs partial)
    const fullRefundAmount = order.totalCents
    const requestedRefundAmount = refundAmount !== null ? refundAmount : fullRefundAmount

    // Validate refund amount
    if (requestedRefundAmount <= 0 || requestedRefundAmount > fullRefundAmount) {
      return NextResponse.json({ 
        error: `Invalid refund amount. Must be between 1 and ${fullRefundAmount}` 
      }, { status: 400 })
    }

    const isFullRefund = requestedRefundAmount === fullRefundAmount

    // Execute refund in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Record refund in ledger (creates negative entries)
      const refundResult = await LedgerService.recordRefund(tx, {
        originalOrderId: orderId,
        refundAmountCents: requestedRefundAmount,
        reason
      })

      // 2. Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { 
          status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
        }
      })

      // 3. Update payment status
      await tx.payment.update({
        where: { orderId },
        data: { 
          status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
        }
      })

      return refundResult
    })

    // Audit Log (Gold Standard)
    const { logAudit } = await import('@/lib/audit')
    const { getRequestId, getClientIp } = await import('@/lib/request-context')
    
    await logAudit({
      action: 'REFUND_ISSUED',
      result: 'SUCCESS',
      severity: 'CRITICAL',
      entityType: 'ORDER',
      entityId: orderId,
      authType: 'SESSION',
      authId: session.userId,
      method: 'POST',
      reqId: await getRequestId(),
      ip: await getClientIp(),
      after: result,
      metadata: { 
        reason,
        refundAmount: requestedRefundAmount,
        isFullRefund
      }
    })

    return NextResponse.json({
      success: true,
      orderId,
      refundedAmount: result.refundedAmount,
      breakdown: result.breakdown,
      isFullRefund,
      ratio: result.ratio,
      message: isFullRefund 
        ? `Full refund of ₹${(result.refundedAmount / 100).toFixed(2)} processed successfully`
        : `Partial refund of ₹${(result.refundedAmount / 100).toFixed(2)} (${(result.ratio * 100).toFixed(1)}%) processed successfully`
    })

  } catch (error) {
    console.error('[REFUND] Error processing refund:', error)
    return NextResponse.json({ 
      error: 'Failed to process refund',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

