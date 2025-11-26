import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp, buildOrderButtons } from '@/lib/whatsapp'
import { writeLog } from '@/lib/log-writer'
import { getTicketNumber } from '@/lib/order-ticket'

const orderInclude = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    payment: true,
    items: { include: { menuItem: true } },
    canteen: { include: { vendor: true } }
  }
})

export type OrderWithRelations = Prisma.OrderGetPayload<typeof orderInclude>

async function ensureOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, ...orderInclude })
  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }
  return order
}

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

  await Promise.allSettled(phones.map(async (to) => {
    try {
      await sendWhatsApp(to, {
        header: 'Paid Order',
        text,
        buttons: buildOrderButtons(order.id),
        templateVariables
      })
      void writeLog('WhatsApp', { event: 'order-paid', to, orderId: order.id })
    } catch (err) {
      console.error(`Failed to notify ${to} for order ${ticketNumber}:`, err)
      void writeLog('WhatsAppError', { event: 'order-paid', to, orderId: order.id, error: err instanceof Error ? err.message : String(err) })
    }
  }))
}

export async function markOrderAsPaid(orderId: string) {
  const order = await ensureOrder(orderId)
  if (order.payment?.status === 'PAID' && order.status === 'PAID') {
    return { alreadyPaid: true as const, order }
  }

  const now = new Date()
  if (order.payment) {
    await prisma.payment.update({ where: { orderId }, data: { status: 'PAID', paidAt: now } })
  } else {
    await prisma.payment.create({
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
  await prisma.order.update({ where: { id: orderId }, data: { status: 'PAID' } })
  const updated = await ensureOrder(orderId)
  await notifyPaid(updated)
  return { alreadyPaid: false as const, order: updated }
}
