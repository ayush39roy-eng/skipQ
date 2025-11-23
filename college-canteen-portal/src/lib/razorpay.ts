import Razorpay from 'razorpay'
import crypto from 'crypto'

const key_id = process.env.RAZORPAY_KEY_ID
const key_secret = process.env.RAZORPAY_KEY_SECRET

if (!key_id || !key_secret) {
    console.warn('Razorpay credentials missing. Payment features will fail.')
}

export const razorpay = new Razorpay({
    key_id: (key_id || 'test_id').trim(),
    key_secret: (key_secret || 'test_secret').trim(),
})

console.log('[Razorpay] Initialized with key_id length:', (key_id || '').trim().length)


interface CreateOrderParams {
    orderId: string
    amountCents: number
    currency?: string
    notes?: Record<string, string>
}

export async function createRazorpayOrder({ orderId, amountCents, currency = 'INR', notes }: CreateOrderParams) {
    const options = {
        amount: Math.round(amountCents), // Razorpay expects amount in smallest currency unit (paise)
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

export function verifyRazorpaySignature(body: string, signature: string, secret: string = key_secret || '') {
    if (!secret) return false
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex')
    return expectedSignature === signature
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
