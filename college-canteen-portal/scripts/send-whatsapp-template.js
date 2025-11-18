#!/usr/bin/env node
const twilio = require('twilio')

function envRequired(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env ${name}`)
  }
  return value
}

function formatWhatsAppAddress(raw) {
  const trimmed = String(raw).trim()
  if (!trimmed) throw new Error('WhatsApp number is empty')
  return trimmed.startsWith('whatsapp:') ? trimmed : `whatsapp:${trimmed}`
}

async function main() {
  const accountSid = envRequired('TWILIO_ACCOUNT_SID')
  const authToken = envRequired('TWILIO_AUTH_TOKEN')
  const from = formatWhatsAppAddress(envRequired('TWILIO_WHATSAPP_FROM'))
  const toArg = process.argv[2] || process.env.TWILIO_TEMPLATE_TO
  if (!toArg) {
    throw new Error('Provide destination number as first arg or set TWILIO_TEMPLATE_TO (e.g. whatsapp:+91... )')
  }
  const to = formatWhatsAppAddress(toArg)
  const contentSid = envRequired('TWILIO_CONTENT_SID')
  const varsArg = process.argv[3] || process.env.TWILIO_CONTENT_VARS
  let contentVariables = {}
  if (varsArg) {
    try {
      contentVariables = JSON.parse(varsArg)
    } catch (error) {
      throw new Error(`TWILIO_CONTENT_VARS must be valid JSON. Received: ${varsArg}`)
    }
  }

  const client = twilio(accountSid, authToken)
  console.log('[TwilioTemplate] Sending', { to, contentSid, contentVariables })
  const message = await client.messages.create({
    from,
    to,
    contentSid,
    contentVariables: JSON.stringify(contentVariables)
  })
  console.log('[TwilioTemplate] Sent', message.sid)
}

main().catch((error) => {
  console.error('[TwilioTemplate] Failed', error.message)
  process.exitCode = 1
})
