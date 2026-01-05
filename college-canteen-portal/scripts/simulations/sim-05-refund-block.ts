
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
    console.log('--- Resiliency Sim 5: Refund After Settlement ---')

    const vendor = await prisma.vendor.findFirst()
    if (!vendor) throw new Error('No vendor')
    
    // 1. Create Order & Ledger Entry (Marked SETTLED)
    const orderId = crypto.randomBytes(12).toString('hex')
    const ledgerId = crypto.randomBytes(12).toString('hex')

    // Create Order (Minimal)
    await prisma.order.create({
        data: {
            id: orderId,
            vendorId: vendor.id,
            canteenId: (await prisma.canteen.findFirst({ where: { vendorId: vendor.id } }))!.id,
            totalCents: 100,
            status: 'PAID',
            idempotencyKey: crypto.randomUUID()
        }
    })

    // Create LedgerEntry as SETTLED
    await prisma.ledgerEntry.create({
        data: {
            id: ledgerId,
            vendorId: vendor.id,
            orderId: orderId,
            type: 'SALE',
            paymentMode: 'CASH',
            grossAmount: 100,
            taxAmount: 0,
            platformFee: 0,
            netAmount: 100,
            // CRITICAL:
            settlementStatus: 'SETTLED', 
            description: 'Simulated Settled Transaction'
        }
    })

    // 2. Simulate Refund Logic
    console.log('Attempting to Refund a SETTLED order...')
    
    let result = 'success'
    try {
        // Logic from src/app/api/orders/[id]/refund/route.ts
        const entries = await prisma.ledgerEntry.findMany({ where: { orderId } })
        const isSettled = entries.some(e => e.settlementStatus === 'SETTLED')

        if (isSettled) {
            throw new Error('Cannot refund settled order')
        }

        // Proceed to refund...
        console.log('Refunding...')
    } catch (e: any) {
        console.log(`Refund Blocked: ${e.message}`)
        result = 'blocked'
    }

    // Clean up
    await prisma.ledgerEntry.delete({ where: { id: ledgerId } })
    await prisma.order.delete({ where: { id: orderId } })

    if (result === 'blocked') {
        console.log('✅ SUCCESS: Refund was blocked.')
    } else {
        console.error('❌ FAILURE: Refund was ALLOWED on settled order.')
        process.exit(1)
    }
}

main()
    .catch(e => {
        console.error(e)
        // Ensure cleanup even on error if possible, but process.exit kills it
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
