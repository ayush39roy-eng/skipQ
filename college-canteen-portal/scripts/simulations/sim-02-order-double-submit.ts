
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
    console.log('--- Resiliency Sim 2: Order Double-Submit ---')

    // 1. Setup: User and Canteen
    const user = await prisma.user.findFirst()
    const vendor = await prisma.vendor.findFirst()
    if (!user || !vendor) throw new Error('User or Vendor not found')
    
    const canteen = await prisma.canteen.findFirst({ where: { vendorId: vendor.id } })
    if (!canteen) throw new Error('Canteen not found')

    const idempotencyKey = crypto.randomUUID()
    console.log(`Testing with Idempotency Key: ${idempotencyKey}`)

    // 2. Define Order Data
    const orderData = {
        idempotencyKey,
        userId: user.id,
        vendorId: vendor.id,
        canteenId: canteen.id,
        totalCents: 5000,
        status: 'PENDING_PAYMENT',
        createdAt: new Date(),
        updatedAt: new Date(),
        payment: {
            create: {
                amountCents: 5000,
                status: 'PENDING',
                provider: 'manual'
            }
        }
    }

    // 3. Concurrent Create Attempts
    // We simulate the race condition by firing two Promises that try to create using the same Key    console.log('Firing 2 concurrent Create Order requests...')
    
    const createOrder = async (i: number) => {
        try {
            const order = await prisma.order.create({
                data: orderData
            })
            console.log(`Req ${i}: SUCCESS - Created Order ${order.id}`)
            return 'success'
        } catch (e: any) {
            // Expecting Unique Constraint Violation (P2002)
            if (e.code === 'P2002') {
                console.log(`Req ${i}: BLOCKED - Duplicate Idempotency Key (Expected)`)
                return 'blocked'
            }
            console.error(`Req ${i}: FAILED - ${e.message}`)
            return 'error'
        }
    }

    const results = await Promise.all([createOrder(1), createOrder(2)])

    // 4. Verification
    const successCount = results.filter(r => r === 'success').length
    const blockedCount = results.filter(r => r === 'blocked').length

    console.log(`Results: Success=${successCount}, Blocked=${blockedCount}`)

    if (successCount === 1 && blockedCount === 1) {
        console.log('✅ SUCCESS: Exactly one order created, one blocked.')
    } else {
        console.error('❌ FAILURE: Race condition handling incorrect.')
        process.exit(1)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
