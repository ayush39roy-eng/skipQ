import { prisma } from '@/lib/prisma'
import { writeLog } from '@/lib/log-writer'

type Action = 'COMPLETE' | 'CANCEL'

const ACTIVE_STATUSES = ['PAID', 'ACCEPTED', 'CONFIRMED']

function sanitizePhone(value: string | null | undefined) {
  if (!value) return ''
  return value.replace(/^whatsapp:/i, '').replace(/[^\d]/g, '')
}

function phonesMatch(a: string, b: string) {
  if (!a || !b) return false
  return a === b || a.endsWith(b) || b.endsWith(a)
}

async function resolveOrderFromPhone(rawFrom: string | null | undefined) {
  const normalized = sanitizePhone(rawFrom)
  if (!normalized) return null

  const candidates = await prisma.order.findMany({
    where: { status: { in: ACTIVE_STATUSES } },
    orderBy: { createdAt: 'desc' },
    take: 25,
    include: {
      canteen: {
        select: {
          notificationPhones: true,
          vendor: { select: { phone: true } }
        }
      }
    }
  })

  for (const order of candidates) {
    const vendorPhone = sanitizePhone(order.canteen.vendor?.phone)
    const canteenPhones = (order.canteen.notificationPhones || []).map(sanitizePhone)
    if (phonesMatch(vendorPhone, normalized)) return order.id
    if (canteenPhones.some(phone => phonesMatch(phone, normalized))) return order.id
  }
  return null
}

function normalizeAction(value: string | undefined | null): Action | null {
  if (!value) return null
  const upper = value.trim().toUpperCase()
  if (upper === '1' || upper === 'CONFIRM' || upper === 'COMPLETE' || upper === 'COMPLETED') return 'COMPLETE'
  if (upper === '0' || upper === 'CANCEL') return 'CANCEL'
  return null
}

function parsePayload(payload: string) {
  const trimmed = payload.trim()
  if (!trimmed) return { action: null as Action | null, orderId: null as string | null }

  for (const separator of ['|', ':']) {
    if (trimmed.includes(separator)) {
      const [token, rest] = trimmed.split(separator)
      return { action: normalizeAction(token), orderId: rest?.trim() || null }
    }
  }

  return { action: normalizeAction(trimmed), orderId: null as string | null }
}

// Unified POST handler for Twilio (Form Data) and Gupshup (JSON)
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let Body = ''
    let From = ''
    let ButtonPayload = ''

    if (contentType.includes('application/json')) {
      // Gupshup or Meta
      const json = await req.json()
      void writeLog('WhatsAppWebhookJSON', json)

      // Gupshup structure
      if (json.type === 'message' && json.payload) {
        From = json.payload.source
        if (json.payload.type === 'text') {
          Body = json.payload.payload?.text || ''
        } else if (json.payload.type === 'button_reply') {
          ButtonPayload = json.payload.payload?.id || ''
          Body = json.payload.payload?.title || ''
        }
      }
    } else {
      // Twilio (Form Data)
      const formData = await req.formData()
      Body = formData.get('Body') as string
      From = formData.get('From') as string
      ButtonPayload = formData.get('ButtonPayload') as string
      void writeLog('WhatsAppWebhookForm', { From, Body, ButtonPayload })
    }

    // Determine the action
    // Payload format expected: "CONFIRM:orderId" or "CANCEL:orderId"
    const payload = (ButtonPayload || Body || '').trim()

    if (!payload) {
      return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    const { action, orderId: parsedOrderId } = parsePayload(payload)
    let orderId = parsedOrderId

    if (!action) {
      return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    if (!orderId) {
      orderId = await resolveOrderFromPhone(From)
    }

    if (!orderId) {
      console.warn('WhatsApp webhook: unable to resolve order for payload', { From, payload })
      return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      console.error(`Order ${orderId} not found via webhook`)
      return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    if (action === 'COMPLETE') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED' }
      })
    } else if (action === 'CANCEL') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      })
    }

    return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/plain' } })
  }
}

// Allow GET/HEAD/OPTIONS for provider validation checks (Gupshup/Twilio console).
export async function GET(req: Request) {
  // Gupshup sometimes just pings the URL to see if it's active.
  // Twilio might send a challenge, but usually it's just a status check.
  // We return 200 OK to satisfy the validation.
  try {
    const url = new URL(req.url)
    const challenge = url.searchParams.get('hub.challenge') || url.searchParams.get('challenge') || url.searchParams.get('verify_token')
    if (challenge) return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  } catch {
    // ignore
  }
  return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } })
}

export async function HEAD() {
  return new Response(null, { status: 200 })
}

export async function OPTIONS() {
  return new Response('OK', { status: 200, headers: { Allow: 'GET,POST,HEAD,OPTIONS' } })
}
