import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp, buildOrderButtons } from '@/lib/whatsapp'
import { writeLog } from '@/lib/log-writer'

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

  const shortId = order.id.slice(0, 8)
  const total = (order.totalCents / 100).toFixed(2)
  const text = `Order ${shortId} paid — ₹${total}\n${summarizeItems(order)}\nReply CONFIRM:${order.id} or CANCEL:${order.id}`
  await Promise.allSettled(phones.map(async (to) => {
    try {
      await sendWhatsApp(to, {
        header: 'Paid Order',
        text,
        buttons: buildOrderButtons(order.id)
      })
      void writeLog('WhatsApp', { event: 'order-paid', to, orderId: order.id })
    } catch (err) {
      console.error(`Failed to notify ${to} for order ${shortId}:`, err)
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
