import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp, buildOrderButtons } from '@/lib/whatsapp'
import { writeLog } from '@/lib/log-writer'
import { getTicketNumber } from '@/lib/order-ticket'
import { logAudit } from '@/lib/audit'

const orderInclude = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    payment: true,
    items: { include: { menuItem: true } },
    canteen: { include: { vendor: true } }
  }
})

export type OrderWithRelations = Prisma.OrderGetPayload<typeof orderInclude>

function summarizeItems(order: OrderWithRelations) {
  if (!order.items.length) return 'Items pending'
  const parts = order.items.slice(0, 4).map(item => `${item.menuItem?.name ?? 'Item'} x${item.quantity}`)
  const suffix = order.items.length > 4 ? '…' : ''
  return `${parts.join(', ')}${suffix}`
}

async function notifyPaid(order: OrderWithRelations) {
  const vendor = order.canteen?.vendor
  const numbers = order.canteen?.notificationPhones?.length
    ? order.canteen.notificationPhones
    : (vendor?.phone ? [vendor.phone] : [])
  const phones = (numbers || []).map(p => (p || '').trim()).filter(Boolean)
  if (!vendor?.whatsappEnabled || !phones.length) return

  const ticketNumber = getTicketNumber(order.id)
  const vendorAmountCents = order.vendorTakeCents ?? Math.max(order.totalCents - order.commissionCents, 0)
  // Use vendorAmountCents as-is. Do not fall back to order.totalCents when vendorAmountCents is 0,
  // as that would misrepresent the vendor payout. If the payout is zero, surface that explicitly.
  const amountCents = vendorAmountCents
  const total = (amountCents / 100).toFixed(2)
  const itemsSummary = summarizeItems(order)

  // Text fallback shown to vendors
  const zeroPayoutNote = amountCents === 0 ? ' (Vendor payout: ₹0.00)' : ''
  const text = `Ticket #${ticketNumber} paid — ₹${total}${zeroPayoutNote}\n${itemsSummary}\nReply 1 to mark completed or 0 to cancel.`

  // Template variables for Twilio Content API
  // The Twilio Content Template must be configured to use these variables:
  // - {{1}}: Short ticket number (as returned by `getTicketNumber`)
  // - {{2}}: Total amount with currency symbol
  // - {{3}}: Items summary
  // - {{confirm_payload}}: Pre-formatted payload for Complete button (1|fullOrderId)
  // - {{cancel_payload}}: Pre-formatted payload for Cancel button (CANCEL:fullOrderId)
  // - {{order_id}}: Full order ID for reference
  const templateVariables = {
    '1': ticketNumber,
    '2': `₹${total}`,
    '3': itemsSummary,
    'order_id': order.id,
    'ticket_number': ticketNumber,
    'payout_amount': `₹${total}`,
    'confirm_payload': `1|${order.id}`,
    'cancel_payload': `0|${order.id}`
  }

  const results = await Promise.allSettled(phones.map(async (to) => {
    try {
      await sendWhatsApp(to, {
        header: 'Paid Order',
        text,
        buttons: buildOrderButtons(order.id),
        templateVariables
      })
      void writeLog('WhatsApp', { event: 'order-paid', to, orderId: order.id })
      
      // Log successful notification to audit
      void logAudit({
        action: 'WHATSAPP_NOTIFICATION_SENT',
        result: 'ALLOWED',
        severity: 'INFO',
        method: 'INTERNAL',
        authType: 'ANONYMOUS',
        metadata: { orderId: order.id, to, event: 'order-paid' }
      })
      
      return { success: true, to }
    } catch (err) {
      console.error(`Failed to notify ${to} for order ${ticketNumber}:`, err)
      void writeLog('WhatsAppError', { event: 'order-paid', to, orderId: order.id, error: err instanceof Error ? err.message : String(err) })
      
      // Log failed notification to audit for visibility
      void logAudit({
        action: 'WHATSAPP_NOTIFICATION_FAILED',
        result: 'INTERNAL_ERROR',
        severity: 'WARN',
        method: 'INTERNAL',
        authType: 'ANONYMOUS',
        metadata: { 
          orderId: order.id, 
          to, 
          event: 'order-paid',
          error: err instanceof Error ? err.message : String(err)
        }
      })
      
      return { success: false, to, error: err }
    }
  }))
  
  return results
}

/**
 * Mark an order as paid using an atomic transaction.
 * 
 * This function ensures that Payment and Order status updates happen atomically,
 * preventing partial state updates if the process crashes mid-operation.
 * 
 * WhatsApp notifications are sent AFTER the transaction commits successfully.
 */
export async function markOrderAsPaid(orderId: string) {
  // Use an interactive transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Fetch the order within the transaction context
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        items: { include: { menuItem: true } },
        canteen: { include: { vendor: true } }
      }
    })

    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    // Idempotency check: if already paid, return early
    if (order.payment?.status === 'PAID' && order.status === 'PAID') {
      return { alreadyPaid: true as const, order }
    }

    const now = new Date()

    // Update or create payment record
    if (order.payment) {
      await tx.payment.update({
        where: { orderId },
        data: { status: 'PAID', paidAt: now }
      })
    } else {
      await tx.payment.create({
        data: {
          orderId,
          amountCents: order.totalCents,
          paymentLink: '',
          provider: 'manual',
          status: 'PAID',
          paidAt: now
        }
      })
    }

    // Update order status
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'PAID' }
    })

    // Create ledger entry for this sale
    if (order.vendorId && order.payment) {
      await tx.ledgerEntry.create({
        data: {
          vendorId: order.vendorId,
          orderId: order.id,
          type: 'SALE',
          paymentMode: order.payment.provider || 'razorpay',
          grossAmount: order.totalCents,
          taxAmount: order.taxCents,
          platformFee: order.commissionCents,
          netAmount: order.vendorTakeCents,
          orderType: order.orderType || 'SELF_ORDER',
          platformFeeRate: order.platformFeeRate ?? (
            order.orderType === 'PRE_ORDER' 
              ? (order.canteen?.vendor?.preOrderFeeRate ?? 0.03) 
              : (order.canteen?.vendor?.selfOrderFeeRate ?? 0.015)
          ),
          settlementStatus: 'UNSETTLED'
        }
      })
    }

    // Fetch the updated order (within transaction to ensure consistency)
    const updatedOrder = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        items: { include: { menuItem: true } },
        canteen: { include: { vendor: true } }
      }
    })

    return { alreadyPaid: false as const, order: updatedOrder! }
  })

  // IMPORTANT: Side effects (WhatsApp notifications) happen AFTER the transaction commits
  // This ensures we only notify if the database state is consistent
  if (!result.alreadyPaid && result.order) {
    try {
      await notifyPaid(result.order)
    } catch (err) {
      // Log notification failure but don't fail the operation
      // The database state is already consistent
      console.error('Failed to send payment notification:', err)
      void logAudit({
        action: 'PAYMENT_NOTIFICATION_FAILED',
        result: 'INTERNAL_ERROR',
        severity: 'WARN',
        method: 'INTERNAL',
        authType: 'ANONYMOUS',
        metadata: { orderId, error: err instanceof Error ? err.message : String(err) }
      })
    }
  }

  return result
}
