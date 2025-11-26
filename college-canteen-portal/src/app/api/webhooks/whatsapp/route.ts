import { prisma } from '@/lib/prisma'
import { validateRequest } from 'twilio'
import { writeLog } from '@/lib/log-writer'

type Action = 'COMPLETE' | 'CANCEL'

const ACTIVE_STATUSES = ['PAID', 'ACCEPTED', 'CONFIRMED']

function sanitizePhone(value: string | null | undefined) {
  if (!value) return ''
  return value.replace(/^whatsapp:/i, '').replace(/[^\d]/g, '')
}

async function phonesMatch(a: string | null | undefined, b: string | null | undefined): Promise<boolean> {
  if (!a || !b) return false

  // Normalize: strip non-digits
  const norm = (s: string) => {
    const digits = (s || '').replace(/\D+/g, '')
    // Strip leading zeros
    return digits.replace(/^0+/, '')
  }

  const na = norm(a)
  const nb = norm(b)

  if (!na || !nb) return false

  // Try to use libphonenumber-js if available to compare E.164 formats
  try {
    // Avoid static TS resolution; attempt runtime require if available (e.g., node).
    const req = (globalThis as unknown as { require?: (id: string) => unknown }).require
    const mod = req ? (req('libphonenumber-js') as unknown) : null
    const modObj = mod as { parsePhoneNumberFromString?: (s: string) => unknown; parsePhoneNumber?: (s: string) => unknown } | null
    const parse = modObj?.parsePhoneNumberFromString ?? modObj?.parsePhoneNumber
    if (typeof parse === 'function') {
      try {
        const pa = parse(na)
        const pb = parse(nb)
        const paFmt = pa as { format?: (f: string) => string } | null
        const pbFmt = pb as { format?: (f: string) => string } | null
        const ea = paFmt && typeof paFmt.format === 'function' ? paFmt.format('E.164') : null
        const eb = pbFmt && typeof pbFmt.format === 'function' ? pbFmt.format('E.164') : null
        if (ea && eb) return ea === eb
      } catch {
        // parsing failed — fall back
      }
    }
  } catch {
    // lib not available — continue to fallback logic
  }

  // Exact normalized digits match
  if (na === nb) return true

  // Safe fallback: if both are long enough, compare last 10 digits only
  if (na.length >= 10 && nb.length >= 10) {
    const la = na.slice(-10)
    const lb = nb.slice(-10)
    return la === lb
  }

  return false
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
    if (await phonesMatch(vendorPhone, normalized)) return order.id
    for (const phone of canteenPhones) {
      if (await phonesMatch(phone, normalized)) return order.id
    }
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

      // Twilio request validation: ensure the request is genuinely from Twilio.
      const signature = req.headers.get('x-twilio-signature') || req.headers.get('X-Twilio-Signature') || ''
      const authToken = process.env.TWILIO_AUTH_TOKEN || ''
      // Build params as simple string map for validation. We only extract fields
      // that Twilio typically sends for incoming WhatsApp messages.
      const params: Record<string, string> = {
        Body: String(formData.get('Body') ?? ''),
        From: String(formData.get('From') ?? ''),
        ButtonPayload: String(formData.get('ButtonPayload') ?? ''),
        MessageSid: String(formData.get('MessageSid') ?? ''),
        SmsSid: String(formData.get('SmsSid') ?? ''),
        SmsStatus: String(formData.get('SmsStatus') ?? ''),
        To: String(formData.get('To') ?? ''),
      }

      if (!signature || !authToken) {
        // Missing credentials or signature — reject
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
      }

      try {
        const url = new URL(req.url).toString()
        const valid = validateRequest(authToken, signature, url, params)
        if (!valid) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
        }
      } catch (err) {
        console.error('Twilio validation error', err)
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
      }

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
