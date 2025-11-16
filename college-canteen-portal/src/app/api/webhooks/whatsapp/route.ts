import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp, buildPrepButtons } from '@/lib/whatsapp'

function ok() { return NextResponse.json({ ok: true }) }

async function handleMetaWebhook(req: NextRequest) {
  const payload = await req.json().catch(() => ({})) as any
  const entries = payload?.entry ?? []
  for (const entry of entries) {
    const changes = entry.changes ?? []
    for (const change of changes) {
      const messages = change.value?.messages ?? []
      for (const msg of messages) {
        const from = msg.from
        const text = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.id || ''
        await routeMessage(from, text)
      }
    }
  }
  return ok()
}

async function routeMessage(fromPhone: string, text: string) {
  if (!fromPhone || !text) return
  // Find vendor by phone
  const vendor = await prisma.vendor.findFirst({ where: { phone: { equals: fromPhone } } })
  if (!vendor) return
  // Commands: CONFIRM:orderId | CANCEL:orderId | PREP:orderId:minutes | ITEM:menuItemId:TOGGLE
  if (text.startsWith('CONFIRM:')) {
    const orderId = text.split(':')[1]
    if (!orderId) return
    await prisma.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED' } })
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { canteen: { include: { vendor: true } } } })
    const to = order?.canteen.vendor?.phone
    if (order?.canteen.vendor?.whatsappEnabled && to) {
      await sendWhatsApp(to, { header: 'Prep Time', text: `Order ${orderId.slice(0,8)} confirmed. Set prep time:`, buttons: buildPrepButtons(orderId) })
    }
    return
  }
  if (text.startsWith('CANCEL:')) {
    const orderId = text.split(':')[1]
    if (!orderId) return
    await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } })
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { canteen: { include: { vendor: true } } } })
    const to = order?.canteen.vendor?.phone
    if (order?.canteen.vendor?.whatsappEnabled && to) {
      await sendWhatsApp(to, { text: `Order ${orderId.slice(0,8)} cancelled.` })
    }
    return
  }
  if (text.startsWith('PREP:')) {
    const [, orderId, minutesStr] = text.split(':')
    const minutes = parseInt(minutesStr || '0', 10)
    if (!orderId || !minutes) return
    await prisma.order.update({ where: { id: orderId }, data: { prepMinutes: minutes } })
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { canteen: { include: { vendor: true } } } })
    const to = order?.canteen.vendor?.phone
    if (order?.canteen.vendor?.whatsappEnabled && to) {
      await sendWhatsApp(to, { text: `Prep time set to ${minutes} min for ${orderId.slice(0,8)}.` })
    }
    return
  }
  if (text.startsWith('ITEM:')) {
    const [, itemId, action] = text.split(':')
    if (!itemId) return
    if (action === 'TOGGLE') {
      const item = await prisma.menuItem.findUnique({ where: { id: itemId } })
      if (!item) return
      await prisma.menuItem.update({ where: { id: itemId }, data: { available: !item.available } })
    }
    return
  }
}

export async function POST(req: NextRequest) {
  const provider = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase()
  if (provider === 'meta') {
    // Optionally verify signature here with X-Hub-Signature-256
    return handleMetaWebhook(req)
  }
  // Simple Twilio-compatible fallback
  const body = await req.formData().catch(() => null)
  if (body) {
    const from = (body.get('From') as string || '').replace('whatsapp:', '')
    const text = (body.get('Body') as string) || ''
    await routeMessage(from, text)
  }
  return ok()
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const challenge = url.searchParams.get('hub.challenge')
  if (challenge) return new NextResponse(challenge, { status: 200 })
  return ok()
}
