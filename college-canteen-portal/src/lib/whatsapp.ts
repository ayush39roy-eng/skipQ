type Provider = 'meta' | 'twilio'

function envRequired(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

async function sendViaMeta(to: string, body: any) {
  const token = envRequired('WHATSAPP_META_TOKEN')
  const phoneNumberId = envRequired('WHATSAPP_META_PHONE_NUMBER_ID')
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, ...body })
  })
  if (!res.ok) {
    const t = await res.text()
    console.error('Meta WhatsApp send failed:', t)
  }
}

async function sendViaTwilio(to: string, body: any) {
  const sid = envRequired('TWILIO_ACCOUNT_SID')
  const token = envRequired('TWILIO_AUTH_TOKEN')
  const from = envRequired('TWILIO_WHATSAPP_FROM')
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
  const params = new URLSearchParams()
  params.set('From', `whatsapp:${from}`)
  params.set('To', `whatsapp:${to}`)
  params.set('Body', body.text?.body ?? body.body ?? '')
  const g: any = globalThis as any
  const base64 = g.Buffer ? g.Buffer.from(`${sid}:${token}`).toString('base64') : (g.btoa ? g.btoa(`${sid}:${token}`) : '')
  const res = await fetch(url, { method: 'POST', headers: { Authorization: 'Basic ' + base64 }, body: params as any })
  if (!res.ok) {
    const t = await res.text()
    console.error('Twilio WhatsApp send failed:', t)
  }
}

export async function sendWhatsApp(to: string, payload: { text?: string, buttons?: { id: string, title: string }[], header?: string }) {
  const provider = (process.env.WHATSAPP_PROVIDER as Provider) || 'meta'
  if (!to) return
  try {
    if (provider === 'meta') {
      if (payload.buttons && payload.buttons.length) {
        await sendViaMeta(to, {
          type: 'interactive',
          interactive: {
            type: 'button',
            header: payload.header ? { type: 'text', text: payload.header } : undefined,
            body: { text: payload.text ?? '' },
            action: { buttons: payload.buttons.map(b=> ({ type: 'reply', reply: { id: b.id, title: b.title } })) }
          }
        })
      } else {
        await sendViaMeta(to, { type: 'text', text: { body: payload.text ?? '' } })
      }
    } else if (provider === 'twilio') {
      await sendViaTwilio(to, { text: { body: payload.text ?? '' } })
    }
  } catch (e) {
    console.warn('WhatsApp not configured, falling back to log:', payload)
  }
}

export function buildOrderButtons(orderId: string) {
  return [
    { id: `CONFIRM:${orderId}`, title: 'Confirm' },
    { id: `CANCEL:${orderId}`, title: 'Cancel' },
  ]
}

export function buildPrepButtons(orderId: string) {
  return [5,10,15,20,30].map(m => ({ id: `PREP:${orderId}:${m}`, title: `${m} min` }))
}
