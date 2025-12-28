import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { sendEmail } from '@/lib/email'
import { sendWhatsApp } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await requireRole(['VENDOR'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await req.formData()
  const orderId = String(form.get('orderId') ?? '')
  const action = String(form.get('action') ?? '')
  const prepMinutes = form.get('prepMinutes') ? Number(form.get('prepMinutes')) : undefined

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.vendorId !== session.user.vendorId) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status === 'PENDING') {
    return NextResponse.json({ error: 'Order not paid yet' }, { status: 409 })
  }

  // Validate action against allowlist
  const ALLOWED_ACTIONS = ['CONFIRM', 'EXTEND_PREP', 'CANCELLED', 'READY', 'COMPLETED', 'SET_PREP']
  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (action === 'CONFIRM') {
    // Persist prepMinutes if provided along with confirmation
    const updateData: { status: string; prepMinutes?: number } = { status: 'CONFIRMED' }
    if (typeof prepMinutes === 'number' && !Number.isNaN(prepMinutes)) updateData.prepMinutes = prepMinutes
    await prisma.order.update({ where: { id: orderId }, data: updateData })

    // Notify user via WhatsApp
    try {
      const fullOrder = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true, canteen: true } })
      if (fullOrder?.user?.phone) {
        const prepMsg = updateData.prepMinutes ? ` Prep time: ${updateData.prepMinutes} mins.` : ''
        await sendWhatsApp(fullOrder.user.phone, {
          text: `Your order #${orderId.slice(-4)} at ${fullOrder.canteen.name} is CONFIRMED!${prepMsg}`
        })
      }
    } catch (err) {
      console.error('Failed to send CONFIRM notification', err)
    }

  } else if (action === 'EXTEND_PREP') {
    // One-time +5 minutes buffer; only apply if not already extended
    const current = await prisma.order.findUnique({ where: { id: orderId } })
    if (!current) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (current.prepExtended) return NextResponse.json({ error: 'Prep already extended' }, { status: 409 })
    // Compute remaining minutes relative to the time when prepMinutes was last set (best-effort)
    const now = new Date()
    const setAt = current.updatedAt ?? now
    const elapsedMs = Math.max(0, now.getTime() - setAt.getTime())
    const originalMs = (current.prepMinutes ?? 0) * 60_000
    const remainingMs = Math.max(0, originalMs - elapsedMs)
    const remainingMinutes = Math.ceil(remainingMs / 60_000)
    const newPrep = remainingMinutes + 5
    await prisma.order.update({ where: { id: orderId }, data: { prepMinutes: newPrep, prepExtended: true } })
  } else if (action === 'CANCELLED') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } })
    // Mark payment as refund-pending (if payment exists) and notify user by email
    try {
      const full = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true, payment: true, canteen: true } })
      if (full?.payment) {
        await prisma.payment.update({ where: { orderId }, data: { status: 'REFUND_PENDING' } })
      }

      // Notify user by email if available
      const userEmail = full?.user?.email
      if (userEmail) {
        const subject = 'Refund initiated for your order'
        const text = `Your order ${orderId.slice(0, 8)} has been cancelled and a refund has been initiated. The refund will be processed shortly and should reflect in your original payment method within a few business days.`
        const html = `<p>Your order <strong>${orderId.slice(0, 8)}</strong> has been cancelled and a refund has been initiated.</p><p>The refund will be processed shortly and should reflect in your original payment method within a few business days.</p>`
        await sendEmail(userEmail, subject, text, html)
      }

      // Notify admin numbers configured on the canteen (if any)
      const phones: string[] = (full?.canteen?.notificationPhones as string[] | undefined) ?? []
      if (phones.length) {
        const amount = typeof full?.totalCents === 'number' ? `₹${(full!.totalCents / 100).toFixed(2)}` : '—'
        const adminMsg = `Order ${orderId.slice(0, 8)} was CANCELLED. Amount: ${amount}. Refund initiated.`
        for (const p of phones) {
          try {
            await sendWhatsApp(p, { text: adminMsg })
          } catch (err) {
            console.error('Failed to notify admin phone', p, err)
          }
        }
      }
    } catch (err) {
      // Swallow errors to avoid blocking vendor UI; log in server logs
      console.error('Refund notification failed', err)
    }
  } else if (action === 'READY') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'READY' } })

    // Notify user via WhatsApp
    try {
      const fullOrder = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true, canteen: true } })
      if (fullOrder?.user?.phone) {
        await sendWhatsApp(fullOrder.user.phone, {
          text: `Your order #${orderId.slice(-4)} is READY at ${fullOrder.canteen.name}! Please pick it up.`
        })
      }
    } catch (err) {
      console.error('Failed to send READY notification', err)
    }

  } else if (action === 'COMPLETED') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'COMPLETED' } })
  } else if (action === 'SET_PREP' && typeof prepMinutes === 'number' && !Number.isNaN(prepMinutes)) {
    await prisma.order.update({ where: { id: orderId }, data: { prepMinutes } })
  }

  return NextResponse.json({ ok: true })
}
