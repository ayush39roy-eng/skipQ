import twilio from 'twilio'
import { writeLog } from '@/lib/log-writer'

type Provider = 'meta' | 'twilio' | 'gupshup'

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

type GupshupMessage =
  | { type: 'text'; text: string }
  | {
    type: 'quick_reply'
    content: {
      type: 'text'
      header: string
      text: string
      options: { type: 'text'; title: string; postbackText: string }[]
    }
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

function resolveProvider(): Provider | null {
  const declared = process.env.WHATSAPP_PROVIDER as Provider | undefined
  if (declared === 'meta' || declared === 'twilio' || declared === 'gupshup') return declared

  // Auto-detect
  if (process.env.GUPSHUP_API_KEY && process.env.GUPSHUP_SRC_NAME) return 'gupshup'
  const hasTwilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM

  // Only default to Meta if keys are actually present, otherwise return null
  const hasMeta = process.env.WHATSAPP_META_TOKEN && process.env.WHATSAPP_META_PHONE_NUMBER_ID
  if (hasTwilio) return 'twilio'
  if (hasMeta) return 'meta'

  return null
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

  log('Sending via Twilio', {
    to,
    from,
    mode: contentSid ? 'template' : 'text',
    contentSid: contentSid || 'none',
    hasVariables: Boolean(payload.templateVariables)
  })

  try {
    const messageOptions: Parameters<TwilioClient['messages']['create']>[0] = {
      from,
      to: toWhatsApp,
    }

    if (contentSid && payload.templateVariables) {
      // Use Content API (Templates)
      messageOptions.contentSid = contentSid
      messageOptions.contentVariables = resolveContentVariables(payload.templateVariables)
    } else {
      // Fallback to plain text
      messageOptions.body = payload.text.body
    }

    const message = await client.messages.create(messageOptions)
    log('Twilio send success', { to, sid: message.sid, status: message.status })
  } catch (error) {
    console.error('Twilio WhatsApp send failed:', error)
    void writeLog('WhatsAppError', { provider: 'twilio', to, error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

async function sendViaGupshup(to: string, payload: { text: string, buttons?: { id: string, title: string }[], header?: string }) {
  const apiKey = envRequired('GUPSHUP_API_KEY')
  const srcName = envRequired('GUPSHUP_SRC_NAME')

  // Gupshup uses form-urlencoded for the main wrapper, but the 'message' param is JSON
  const url = 'https://api.gupshup.io/sm/api/v1/msg'

  let messageJson: GupshupMessage

  if (payload.buttons && payload.buttons.length > 0) {
    // Use quick_reply for buttons
    messageJson = {
      type: 'quick_reply',
      content: {
        type: 'text',
        header: payload.header || '',
        text: payload.text,
        options: payload.buttons.map(b => ({
          type: 'text',
          title: b.title,
          postbackText: b.id // This is what we get back in the webhook
        }))
      }
    }
  } else {
    messageJson = {
      type: 'text',
      text: payload.text
    }
  }

  const params = new URLSearchParams()
  params.append('channel', 'whatsapp')
  params.append('source', srcName)
  params.append('destination', to)
  params.append('message', JSON.stringify(messageJson))
  params.append('src.name', srcName)

  log('Sending via Gupshup', { to, hasButtons: Boolean(payload.buttons?.length) })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'apikey': apiKey
    },
    body: params
  })

  if (!res.ok) {
    const t = await res.text()
    console.error('Gupshup WhatsApp send failed:', t)
    void writeLog('WhatsAppError', { provider: 'gupshup', to, detail: t })
  } else {
    const t = await res.text()
    log('Gupshup send success', { to, response: t })
  }
}

export async function sendWhatsApp(to: string, payload: { text?: string, buttons?: { id: string, title: string }[], header?: string, templateVariables?: Record<string, unknown> | string }) {
  const provider = resolveProvider()
  if (!to) return

  if (!provider) {
    console.log('[WhatsApp] No provider configured. Skipping message dispatch.')
    void writeLog('WhatsAppSkipped', { to, reason: 'No provider configured' })
    return
  }

  try {
    log('Preparing message', { provider, to, hasButtons: Boolean(payload.buttons?.length) })

    if (provider === 'gupshup') {
      await sendViaGupshup(to, {
        text: payload.text ?? '',
        buttons: payload.buttons,
        header: payload.header
      })
    } else if (provider === 'meta') {
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
      // If we have buttons and a template is configured, we try to use the template variables
      // The caller (order-payment.ts) should provide the correct structure for templateVariables
      await sendViaTwilio(to, {
        text: { body: payload.text ?? '' },
        templateVariables: payload.templateVariables
      })
    }
    log('Message dispatched', { provider, to })
  } catch (error) {
    console.warn('WhatsApp send failed:', payload, error)
    void writeLog('WhatsAppError', { provider, to, reason: error instanceof Error ? error.message : String(error) })
  }
}

export function buildOrderButtons(orderId: string) {
  return [
    { id: `1|${orderId}`, title: 'Complete (1)' },
    { id: `0|${orderId}`, title: 'Cancel (0)' },
  ]
}

export function buildPrepButtons(orderId: string) {
  // Updated prep time options per new requirement
  return [20, 30, 40].map(m => ({ id: `PREP:${orderId}:${m}`, title: `${m} min` }))
}
