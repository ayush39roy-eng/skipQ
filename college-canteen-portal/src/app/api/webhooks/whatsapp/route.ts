import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp, buildPrepButtons } from '@/lib/whatsapp'
import crypto from 'crypto'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

function ok() { return NextResponse.json({ ok: true }) }

const orderInclude = Prisma.validator<Prisma.OrderInclude>()({
  canteen: { include: { vendor: true } },
  payment: true
})

type OrderWithCanteenVendor = Prisma.OrderGetPayload<{ include: typeof orderInclude }>

type BroadcastCanteen = {
  vendor?: { phone: string | null } | null
  notificationPhones?: string[] | null
}

type MetaWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string
          text?: { body?: string }
          button?: { text?: string }
          interactive?: { button_reply?: { id?: string } }
        }>
      }
    }>
  }>
}

function timingSafeEqualStr(a: string, b: string) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  // timingSafeEqual throws if lengths differ, so we must check length first.
  // To prevent timing attacks on length, we can double-HMAC or just accept that length leaks are usually minimal risk here.
  // However, a better approach for timing safety is to hash both again and compare hashes, or pad.
  // For this implementation, we'll stick to the standard pattern but ensure we don't crash.
  if (ab.length !== bb.length) {
    // Return false immediately. Length leakage is generally considered acceptable for HMACs in this context
    // as the attacker needs to guess the secret, not just the length.
    return false
  }
  return crypto.timingSafeEqual(ab, bb)
}

async function verifyMetaSignature(raw: string, headerSig: string | null) {
  if (!headerSig) return false
  const appSecret = process.env.WHATSAPP_META_APP_SECRET
  if (!appSecret) {
    console.error('WHATSAPP_META_APP_SECRET is missing')
    return false
  }
  const mac = crypto.createHmac('sha256', appSecret)
  mac.update(raw, 'utf8')
  const expected = 'sha256=' + mac.digest('hex')
  return timingSafeEqualStr(expected, headerSig)
}

async function verifyTwilioSignature(url: string, params: URLSearchParams, headerSig: string | null) {
  if (!headerSig) return false
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) {
    console.error('Twilio signature verification skipped: missing TWILIO_AUTH_TOKEN env')
    return false
  }
  // Twilio signature: HMAC-SHA1 over url + concatenated sorted params
  const sortedKeys = Array.from(params.keys()).sort()
  let data = url
  for (const k of sortedKeys) {
    data += k + (params.get(k) ?? '')
  }
  const mac = crypto.createHmac('sha1', token)
  mac.update(data, 'utf8')
  const expected = mac.digest('base64')
  return timingSafeEqualStr(expected, headerSig)
}

function normalizePhoneCandidates(phone: string) {
  const p = (phone || '').trim()
  if (!p) return [] as string[]
  const noPlus = p.startsWith('+') ? p.slice(1) : p
  const withPlus = p.startsWith('+') ? p : '+' + p
  return Array.from(new Set([p, noPlus, withPlus]))
}

async function getVendorByPhone(fromPhone: string) {
  const candidates = normalizePhoneCandidates(fromPhone)
  if (!candidates.length) return null
  return prisma.vendor.findFirst({ where: { phone: { in: candidates } } })
}

function getBroadcastPhones(canteen?: BroadcastCanteen | null) {
  const vendorPhone = canteen?.vendor?.phone ? [canteen.vendor.phone] : []
  const list = [...(canteen?.notificationPhones ?? []), ...vendorPhone]
  return Array.from(new Set(list)).filter(Boolean)
}

function formatDisplayId(orderId: string) {
  if (!orderId) return ''
  return orderId.length >= 8 ? orderId.slice(0, 8) : orderId
}

async function handleMetaWebhook(req: NextRequest, raw: string) {
  // Verify Meta signature if available
  const sig = req.headers.get('x-hub-signature-256')
  const valid = await verifyMetaSignature(raw, sig)
  if (!valid) {
    console.warn('Meta signature verification failed')
    return new NextResponse('Invalid signature', { status: 401 })
  }
  const payload = JSON.parse(raw || '{}') as MetaWebhookPayload
  const entries = payload?.entry ?? []
  for (const entry of entries) {
    const changes = entry.changes ?? []
    for (const change of changes) {
      const messages = change.value?.messages ?? []
      for (const msg of messages) {
        const from = msg.from
        const text = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.id || ''
        if (!from || !text) continue
        await routeMessage(from, text)
      }
    }
  }
  return ok()
}

async function routeMessage(fromPhone: string, text: string) {
  try {
    if (!fromPhone || !text) return
    const vendor = await getVendorByPhone(fromPhone)
    if (!vendor) return

    if (text.startsWith('CONFIRM:')) {
      const orderId = text.split(':')[1]
      if (!orderId) return
      const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude }) as OrderWithCanteenVendor | null
      if (!order) return
      if (order.canteen?.vendorId !== vendor.id) return
      if (order.payment?.status !== 'PAID') return
      if (order.status === 'CONFIRMED' || order.status === 'CANCELLED') return
      await prisma.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED' } })
      const orderVendor = order?.canteen.vendor
      if (order && orderVendor?.whatsappEnabled) {
        const phones = getBroadcastPhones(order.canteen)
        const displayId = formatDisplayId(orderId)
        for (const to of phones) {
          await sendWhatsApp(to, { header: 'Prep Time', text: `Order ${displayId} confirmed. Choose prep time (reply PREP:${orderId}:20 / 30 / 40):`, buttons: buildPrepButtons(orderId) })
        }
      }
      return
    } else if (text.startsWith('CANCEL:')) {
      const orderId = text.split(':')[1]
      if (!orderId) return
      const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude }) as OrderWithCanteenVendor | null
      if (!order) return
      if (order.canteen?.vendorId !== vendor.id) return
      if (order.status === 'CANCELLED') return
      await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } })
      const orderVendor = order?.canteen.vendor
      if (order && orderVendor?.whatsappEnabled) {
        const phones = getBroadcastPhones(order.canteen)
        const displayId = formatDisplayId(orderId)
        for (const to of phones) {
          await sendWhatsApp(to, { text: `Order ${displayId} cancelled.` })
        }
      }
      return
    } else if (text.startsWith('PREP:')) {
      const [, orderId, minutesStr] = text.split(':')
      const minutes = parseInt(minutesStr || '0', 10)
      const allowed = new Set([20, 30, 40])
      if (!orderId || !minutes || !allowed.has(minutes)) return
      const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude }) as OrderWithCanteenVendor | null
      if (!order) return
      if (order.status !== 'CONFIRMED') return
      if (order.canteen?.vendorId !== vendor.id) return
      if (order.payment?.status !== 'PAID') return
      if (order.prepMinutes === minutes) return
      await prisma.order.update({ where: { id: orderId }, data: { prepMinutes: minutes } })
      const orderVendor = order?.canteen.vendor
      if (order && orderVendor?.whatsappEnabled) {
        const phones = getBroadcastPhones(order.canteen)
        const displayId = formatDisplayId(orderId)
        for (const to of phones) {
          await sendWhatsApp(to, { text: `Prep time set to ${minutes} min for ${displayId}.` })
        }
      }
      return
    } else if (text.startsWith('ITEM:')) {
      const [, itemId, action] = text.split(':')
      if (!itemId) return
      if (action === 'TOGGLE') {
        const item = await prisma.menuItem.findUnique({ where: { id: itemId }, include: { canteen: true } })
        if (!item || !item.canteen) return
        if (item.canteen?.vendorId !== vendor.id) return
        const newAvailable = !item.available
        await prisma.menuItem.update({ where: { id: itemId }, data: { available: newAvailable } })
        try {
          const phones = getBroadcastPhones(item.canteen)
          const label = item.name || itemId
          for (const to of phones) {
            await sendWhatsApp(to, { text: `Item ${label} is now ${newAvailable ? 'available' : 'unavailable'}.` })
          }
        } catch (notifyErr) {
          console.warn('Failed to broadcast item availability change', notifyErr)
        }
      }
      return
    }
  } catch (e) {
    console.warn('WhatsApp routeMessage error', e)
  }
}

export async function POST(req: NextRequest) {
  const provider = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase()
  const raw = await req.text()
  if (provider === 'meta') {
    return handleMetaWebhook(req, raw)
  }
  // Twilio verification and handling
  const params = new URLSearchParams(raw)
  const sig = req.headers.get('x-twilio-signature')
  const url = req.url
  const valid = await verifyTwilioSignature(url, params, sig)
  if (!valid) {
    console.warn('Twilio signature verification failed')
    return new NextResponse('Invalid signature', { status: 401 })
  }
  const waId = (params.get('WaId') as string) || ''
  const fromRaw = (params.get('From') as string || '')
  const from = waId || fromRaw.replace('whatsapp:', '')
  const buttonPayload = (params.get('ButtonPayload') as string) || ''
  const text = buttonPayload || (params.get('Body') as string) || ''
  await routeMessage(from, text)
  return ok()
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const challenge = url.searchParams.get('hub.challenge')
  const verifyToken = url.searchParams.get('hub.verify_token')
  if (challenge) {
    const expected = process.env.WHATSAPP_META_VERIFY_TOKEN
    if (!expected || verifyToken !== expected) {
      return new NextResponse('Invalid verify token', { status: 403 })
    }
    return new NextResponse(challenge, { status: 200 })
  }
  return ok()
}
