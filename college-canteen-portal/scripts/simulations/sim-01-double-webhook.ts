
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
    console.log('--- Resiliency Sim 1: Double Payment Webhook ---')

    // 1. Setup: Create pending order & payment
    const user = await prisma.user.findFirst()
    if (!user) throw new Error('No user found')
    
    const vendor = await prisma.vendor.findFirst()
    if (!vendor) throw new Error('No vendor found')

    const canteen = await prisma.canteen.findFirst({ where: { vendorId: vendor.id } })
    if (!canteen) throw new Error('No canteen found')

    // Generate valid ObjectIds
    const orderId = crypto.randomBytes(12).toString('hex')
    const paymentId = crypto.randomBytes(12).toString('hex')

    console.log(`Setting up Order: ${orderId} with Payment: ${paymentId}`)

    // Create Order
    await prisma.order.create({
        data: {
            id: orderId,
            userId: user.id,
            vendorId: vendor.id,
            canteenId: canteen.id,
            totalCents: 10000, // ₹100.00
            taxCents: 500,
            commissionCents: 500,
            vendorTakeCents: 9000,
            status: 'PENDING_PAYMENT',
            idempotencyKey: crypto.randomUUID(), // avoiding null collision
            createdAt: new Date(),
            updatedAt: new Date()
        }
    })

    // Create Payment (PENDING)
    await prisma.payment.create({
        data: {
            id: paymentId,
            orderId: orderId,
            amountCents: 10000,
            provider: 'razorpay',
            status: 'PENDING',
            paymentLink: 'http://simulated',
            externalOrderId: `order_${Date.now()}`, // Razorpay Order ID
        }
    })

    // 2. Prepare Webhook Payload
    const payload = JSON.stringify({
        event: 'payment.captured',
        payload: {
            payment: {
                entity: {
                    id: paymentId,
                    order_id: `order_${Date.now()}`, // External Order ID (matches payment)
                    status: 'captured',
                    amount: 10000,
                    currency: 'INR',
                    contact: '+919999999999'
                }
            }
        }
    })

    // 3. Compute Signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret' // Fallback for simulation if env missing but script needs it for hashing logic (though verify will fail if mismatch)
    
    // NOTE: In simulation, if the server checks signature against REAL secret, we must use REAL secret.
    // If we don't have it, the server will reject 401. 
    // Assuming process.env IS loaded.
    
    const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

    // 4. Fire 2 Concurrent Requests
    console.log('Firing 2 concurrent webhook requests...')
    
    const sendWebhook = async (i: number) => {
        try {
            const res = await fetch('http://localhost:3000/api/payment/webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-razorpay-signature': signature
                },
                body: payload
            })
            const text = await res.text()
            console.log(`Req ${i}: Status ${res.status} - ${text}`)
            return res.status
        } catch (e) {
            console.error(`Req ${i} failed:`, e)
            return 0
        }
    }

    await Promise.all([sendWebhook(1), sendWebhook(2)])

    // 5. Verification
    // Wait a moment for async processing
    await new Promise(r => setTimeout(r, 2000))

    const ledgerCount = await prisma.ledgerEntry.count({
        where: { orderId: orderId }
    })

    console.log(`Ledger Entries for Order ${orderId}: ${ledgerCount}`)

    if (ledgerCount === 1) {
        console.log('✅ SUCCESS: Exactly one ledger entry created.')
    } else {
        console.error(`❌ FAILURE: Expected 1 ledger entry, found ${ledgerCount}`)
        process.exit(1)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
