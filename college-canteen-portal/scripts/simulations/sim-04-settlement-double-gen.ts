
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
    console.log('--- Resiliency Sim 4: Settlement Double-Generation ---')
    // We can't easily import the complex Service here because of Next.js deps/alias issues in standalone script sometimes.
    // Instead, we will simulate the LOGIC of checking existing batch.

    // Logic to replicate:
    // 1. Check if SettlementBatch exists for period.
    // 2. If yes, throw.
    // 3. Else, Create.

    const vendor = await prisma.vendor.findFirst()
    if (!vendor) throw new Error('No vendor')

    // Period: Today
    const today = new Date()
    today.setHours(0,0,0,0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Helper to simulate service
    const generateSettlement = async (i: number) => {
        return prisma.$transaction(async (tx) => {
            const existing = await tx.settlementBatch.findFirst({
                where: {
                    vendorId: vendor.id,
                    periodStartDate: today,
                    periodEndDate: tomorrow
                }
            })

            if (existing) {
                console.log(`Req ${i}: Settlement already exists. Aborting.`)
                return 'aborted'
            }

            // Simulate "Expensive Calculation"
            await new Promise(r => setTimeout(r, 500))

            await tx.settlementBatch.create({
                data: {
                    vendorId: vendor.id,
                    periodStartDate: today,
                    periodEndDate: tomorrow,
                    totalFoodAmount: 100,
                    totalTaxAmount: 10,
                    totalPlatformFee: 5,
                    totalVendorPayable: 95,
                    totalOrders: 1,
                    status: 'CREATED'
                }
            })
            console.log(`Req ${i}: Created Settlement.`)
            return 'created'
        }).catch (e => {
            if (e.code === 'P2002') {
                 console.log(`Req ${i}: Blocked by DB Unique Constraint.`)
                 return 'aborted'
            }
            throw e
        })
    }

    // 1. Clean up potential previous test artifacts
    await prisma.settlementBatch.deleteMany({
        where: {
             vendorId: vendor.id,
             periodStartDate: today
        }
    })

    // 2. Run Concurrent Generation
    console.log('Firing 2 concurrent Settlement Generations...')
    const results = await Promise.all([generateSettlement(1), generateSettlement(2)])

    const created = results.filter(r => r === 'created').length
    const aborted = results.filter(r => r === 'aborted').length

    console.log(`Results: Created=${created}, Aborted=${aborted}`)

    // Clean up
    await prisma.settlementBatch.deleteMany({
        where: {
             vendorId: vendor.id,
             periodStartDate: today
        }
    })

    if (created === 1 && aborted === 1) {
        console.log('✅ SUCCESS: Only one settlement batch created.')
    } else {
        console.error(`❌ FAILURE: Race condition not handled.`)
        process.exit(1)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
