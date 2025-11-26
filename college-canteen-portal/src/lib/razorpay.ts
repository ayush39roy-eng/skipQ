import Razorpay from 'razorpay'
import crypto from 'crypto'

const key_id = (process.env.RAZORPAY_KEY_ID || '').trim()
const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim()

// Fail fast: credentials are required for payment functionality. Throw an explicit
// error during module initialization so the app fails loudly and clearly in CI
// / deployment if these values are missing.
if (!key_id || !key_secret) {
    const msg = 'Missing Razorpay credentials: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET'
    console.error(msg)
    throw new Error(msg)
}

export const razorpay = new Razorpay({
    key_id,
    key_secret,
})

console.log('[Razorpay] Initialized with key_id length:', key_id.length)


interface CreateOrderParams {
    orderId: string
    amountCents: number
    currency?: string
    notes?: Record<string, string>
}

export async function createRazorpayOrder({ orderId, amountCents, currency = 'INR', notes }: CreateOrderParams) {
    // Validate inputs strictly to avoid accidental overcharging or silent coercion.
    if (!orderId || typeof orderId !== 'string') {
        throw new Error('createRazorpayOrder: invalid orderId')
    }

    if (!Number.isFinite(amountCents)) {
        throw new Error('createRazorpayOrder: amountCents must be a finite number')
    }

    // Coerce to integer in the smallest currency unit, but do not round up.
    // For example, INR uses paise (1 INR = 100 paise). Ensure amount is at least 1
    // of the smallest currency unit to avoid zero-value orders.
    const amountInteger = Math.floor(amountCents)
    if (amountInteger < 1) {
        throw new Error('createRazorpayOrder: amountCents must be >= 1 (smallest currency unit)')
    }

    const options = {
        amount: amountInteger, // amount in smallest currency unit
        currency,
        receipt: orderId,
        notes,
    }

    try {
        const order = await razorpay.orders.create(options)
        return order
    } catch (error) {
        console.error('Razorpay create order failed:', error)
        throw error
    }
}

export function verifyRazorpaySignature(body: string, signature: string, secret?: string) {
    const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET || key_secret || ''
    if (!webhookSecret) return false
    try {
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex')

        // Convert hex strings to buffers for timing-safe comparison.
        // Guard against invalid hex by catching errors and returning false.
        const expectedBuf = Buffer.from(expectedSignature, 'hex')
        const sigBuf = Buffer.from(signature || '', 'hex')

        // If buffer lengths differ, signatures can't match — return false.
        if (expectedBuf.length !== sigBuf.length) return false

        return crypto.timingSafeEqual(expectedBuf, sigBuf)
    } catch {
        // Any error (invalid hex, etc.) should result in a false verification
        return false
    }
}

export async function getRazorpayOrder(razorpayOrderId: string) {
    try {
        return await razorpay.orders.fetch(razorpayOrderId)
    } catch (error) {
        console.error('Razorpay fetch order failed:', error)
        throw error
    }
}

export async function getRazorpayPayment(paymentId: string) {
    try {
        return await razorpay.payments.fetch(paymentId)
    } catch (error) {
        console.error('Razorpay fetch payment failed:', error)
        throw error
    }
}

export async function getRazorpayOrderPayments(orderId: string) {
    try {
        return await razorpay.orders.fetchPayments(orderId)
    } catch (error) {
        console.error('Razorpay fetch order payments failed:', error)
        throw error
    }
}
