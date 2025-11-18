import twilio from 'twilio'
import { writeLog } from '@/lib/log-writer'

type Provider = 'meta' | 'twilio'

type MetaTextMessage = {
  type: 'text'
  text: {
    body: string
  }
}

type MetaInteractiveButtonMessage = {
  type: 'interactive'
  interactive: {
    type: 'button'
    header?: { type: 'text'; text: string }
    body: { text: string }
    action: {
      buttons: { type: 'reply'; reply: { id: string; title: string } }[]
    }
  }
}

type MetaPayload = MetaTextMessage | MetaInteractiveButtonMessage

type TwilioPayload = {
  text: { body: string }
  templateVariables?: Record<string, unknown> | string
}

const logPrefix = '[WhatsApp]'

function log(message: string, ...args: unknown[]) {
  console.log(logPrefix, message, ...args)
  void writeLog('WhatsApp', { message, args })
}

function envRequired(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

function formatWhatsAppAddress(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Missing WhatsApp number')
  return trimmed.startsWith('whatsapp:') ? trimmed : `whatsapp:${trimmed}`
}

function resolveProvider(): Provider {
  const declared = process.env.WHATSAPP_PROVIDER as Provider | undefined
  if (declared === 'meta' || declared === 'twilio') return declared
  const hasTwilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM
  return hasTwilio ? 'twilio' : 'meta'
}

type TwilioClient = ReturnType<typeof twilio>

let cachedTwilioClient: TwilioClient | null = null

function getTwilioClient() {
  if (cachedTwilioClient) return cachedTwilioClient
  const sid = envRequired('TWILIO_ACCOUNT_SID')
  const token = envRequired('TWILIO_AUTH_TOKEN')
  cachedTwilioClient = twilio(sid, token)
  return cachedTwilioClient
}

function resolveContentVariables(payload: TwilioPayload['templateVariables']) {
  if (typeof payload === 'string') return payload
  if (payload && Object.keys(payload).length) return JSON.stringify(payload)
  const envVars = process.env.TWILIO_CONTENT_VARS
  if (envVars) return envVars
  return '{}'
}

async function sendViaMeta(to: string, body: MetaPayload) {
  const token = envRequired('WHATSAPP_META_TOKEN')
  const phoneNumberId = envRequired('WHATSAPP_META_PHONE_NUMBER_ID')
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`
  log('Sending via Meta', { to, type: body.type })
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, ...body })
  })
  if (!res.ok) {
    const t = await res.text()
    console.error('Meta WhatsApp send failed:', t)
    void writeLog('WhatsAppError', { provider: 'meta', to, detail: t })
  } else {
    log('Meta send success', { to })
  }
}

async function sendViaTwilio(to: string, payload: TwilioPayload) {
  const client = getTwilioClient()
  const from = formatWhatsAppAddress(envRequired('TWILIO_WHATSAPP_FROM'))
  const toWhatsApp = formatWhatsAppAddress(to)
  const contentSid = process.env.TWILIO_CONTENT_SID
  log('Sending via Twilio', { to, from, mode: contentSid ? 'template' : 'text' })
  try {
    const message = await client.messages.create(
      contentSid
        ? {
            from,
            to: toWhatsApp,
            contentSid,
            contentVariables: resolveContentVariables(payload.templateVariables),
          }
        : {
            from,
            to: toWhatsApp,
            body: payload.text.body,
          }
    )
    log('Twilio send success', { to, sid: message.sid, status: message.status })
  } catch (error) {
    console.error('Twilio WhatsApp send failed:', error)
    void writeLog('WhatsAppError', { provider: 'twilio', to, error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

export async function sendWhatsApp(to: string, payload: { text?: string, buttons?: { id: string, title: string }[], header?: string, templateVariables?: Record<string, unknown> | string }) {
  const provider = resolveProvider()
  if (!to) return
  try {
    log('Preparing message', { provider, to, hasButtons: Boolean(payload.buttons?.length) })
    if (provider === 'meta') {
      if (payload.buttons && payload.buttons.length) {
        await sendViaMeta(to, {
          type: 'interactive',
          interactive: {
            type: 'button',
            header: payload.header ? { type: 'text', text: payload.header } : undefined,
            body: { text: payload.text ?? '' },
            action: { buttons: payload.buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })) }
          }
        })
      } else {
        await sendViaMeta(to, { type: 'text', text: { body: payload.text ?? '' } })
      }
    } else if (provider === 'twilio') {
      await sendViaTwilio(to, { text: { body: payload.text ?? '' }, templateVariables: payload.templateVariables })
    }
    log('Message dispatched', { provider, to })
  } catch (error) {
    console.warn('WhatsApp not configured, falling back to log:', payload, error)
    void writeLog('WhatsAppError', { provider, to, reason: error instanceof Error ? error.message : String(error) })
  }
}

export function buildOrderButtons(orderId: string) {
  return [
    { id: `CONFIRM:${orderId}`, title: 'Confirm' },
    { id: `CANCEL:${orderId}`, title: 'Cancel' },
  ]
}

export function buildPrepButtons(orderId: string) {
  // Updated prep time options per new requirement
  return [20,30,40].map(m => ({ id: `PREP:${orderId}:${m}`, title: `${m} min` }))
}
