import nodemailer from 'nodemailer'
import { writeLog } from '@/lib/log-writer'

function envRequired(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null
function getTransporter() {
  if (transporter) return transporter
  try {
    const host = envRequired('SMTP_HOST')
    const port = Number(process.env.SMTP_PORT || '587')
    const secure = (process.env.SMTP_SECURE || 'false') === 'true'
    const user = envRequired('SMTP_USER')
    const pass = envRequired('SMTP_PASS')
    transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
    return transporter
  } catch {
    // If env not configured, leave transporter null and fall back to logging
    console.warn('[Email] SMTP not configured, emails will be logged instead')
    return null
  }
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  try {
    const t = getTransporter()
    const from = process.env.FROM_EMAIL || process.env.SMTP_FROM || 'no-reply@skipq.app'
    const payload = { from, to, subject, text, html }
    if (!t) {
      console.log('[Email] SMTP not configured — would send:', payload)
      await writeLog('EmailLog', { to, subject, text })
      return
    }
    const info = await t.sendMail(payload)
    // nodemailer returns a SentMessageInfo with messageId
    const messageId = (info as unknown as { messageId?: string })?.messageId ?? null
    await writeLog('Email', { to, subject, messageId })
  } catch (error) {
    console.error('[Email] send failed', error)
    await writeLog('EmailError', { error: error instanceof Error ? error.message : String(error) })
  }
}
