import crypto from 'crypto'

interface CashfreeOrderRequest {
  order_id: string
  order_amount: number
  order_currency: string
  customer_details: {
    customer_id: string
    customer_email?: string
    customer_phone?: string
  }
  order_note?: string
  return_url?: string
  notify_url?: string
}

interface CashfreeOrderResponse {
  order_id: string
  order_status: string
  order_token?: string
  payment_link?: string
  payment_session_id?: string
}

function getBaseUrl() {
  const env = (process.env.CASHFREE_ENV || 'sandbox').toLowerCase()
  return env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg'
}

export async function createCashfreeOrder(req: CashfreeOrderRequest) : Promise<CashfreeOrderResponse> {
  const appId = process.env.CASHFREE_APP_ID
  const secret = process.env.CASHFREE_SECRET_KEY
  if (!appId || !secret) throw new Error('Cashfree credentials missing')
  const url = `${getBaseUrl()}/orders`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-client-id': appId,
      'x-client-secret': secret,
      'x-api-version': '2022-09-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cashfree order failed: ${res.status} ${text}`)
  }
  return res.json()
}

export function verifyCashfreeWebhookSignature(bodyRaw: string, signature: string | undefined) {
  const secret = process.env.CASHFREE_SECRET_KEY
  if (!secret) return false
  if (!signature) return false
  const hmac = crypto.createHmac('sha256', secret).update(bodyRaw).digest('base64')
  return hmac === signature
}
