/**
 * Seed 84k Orders Script
 * 
 * Generates ~84,000 fake orders over the last 90 days.
 * Ensures ~400 users exist before starting.
 * Distributes orders across all available canteens/vendors.
 * 
 * Run with: npx ts-node scripts/seed-84k-orders.ts
 */

import { PrismaClient, OrderType, FeePayer, Vendor, Canteen, MenuItem, User } from '@prisma/client'
import { faker } from '@faker-js/faker'

// OVERRIDE FOR PRODUCTION SEEDING
process.env.DATABASE_URL = "mongodb+srv://skipq39_db_user:yMKv2QCdupZiUguA@skipq.xrkoye3.mongodb.net/skipq?retryWrites=true&w=majority&appName=SKIPQ"

const prisma = new PrismaClient()

// Configuration
const TARGET_AMOUNT_CENTS = 84000 * 100 // 84,000 INR
const TARGET_USER_COUNT = 400
const BATCH_SIZE = 20 // Smaller batches for better control
const CONCURRENCY = 1

async function main() {
  console.log(`\n=== Starting Seeding: Target ${TARGET_AMOUNT_CENTS / 100} INR ===\n`)

  // 1. Ensure Users
  await ensureUsers(TARGET_USER_COUNT)
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } })
  console.log(`User Pool Size: ${users.length}`)

  // 2. Fetch Canteens & Menu
  const canteens = await prisma.canteen.findMany({
    include: {
      vendor: true,
      menuItems: {
        where: { available: true }
      }
    }
  })

  // Filter canteens that have a vendor and items
  const validCanteens = canteens.filter(c => c.vendor && c.menuItems.length > 0)

  if (validCanteens.length === 0) {
    throw new Error('No valid canteens found (must have vendor + menu items)')
  }
  console.log(`Active Canteens: ${validCanteens.length}`)
  
  // 3. Generate Orders
  console.log('\nStarting Order Generation...')
  
  let currentTotalCents = 0
  let createdCount = 0
  
  while (currentTotalCents < TARGET_AMOUNT_CENTS) {
    const ordersToCreate = []
    
    // Generate batch
    for (let i = 0; i < BATCH_SIZE; i++) {
        if (currentTotalCents >= TARGET_AMOUNT_CENTS) break;

        const canteen = faker.helpers.arrayElement(validCanteens)
        const user = faker.helpers.arrayElement(users)
        
        // Random Date (Past 90 days)
        const createdAt = faker.date.recent({ days: 90 })
        const updatedAt = new Date(createdAt.getTime() + 1000 * 60 * 15)

        const orderData = generateOrderData(canteen, user, createdAt, updatedAt)
        ordersToCreate.push(orderData)
        
        // Add to tracking (assuming success for estimation)
        if (orderData.meta.status === 'COMPLETED') {
            currentTotalCents += orderData.amounts.grandTotal
        }
    }

    if (ordersToCreate.length === 0) break;

    const results = await Promise.allSettled(
        ordersToCreate.map(data => createOrderTransaction(data))
    )

    const successes = results.filter(r => r.status === 'fulfilled').length
    createdCount += successes
    
    const percent = ((currentTotalCents / TARGET_AMOUNT_CENTS) * 100).toFixed(1)
    process.stdout.write(`\rProgress: ${currentTotalCents/100}/${TARGET_AMOUNT_CENTS/100} INR (${percent}%) - ${createdCount} Orders`)
  }

  console.log(`\n\nDONE! Created ${createdCount} orders. Total Value: ${currentTotalCents/100} INR`)
}

// Ensure 400 users exist
async function ensureUsers(targetCount: number) {
    const count = await prisma.user.count()
    if (count >= targetCount) {
        console.log(`Existing users (${count}) sufficient.`)
        return
    }

    const needed = targetCount - count
    console.log(`Creating ${needed} dummy users...`)
    
    const newUsers = []
    for (let i = 0; i < needed; i++) {
        const firstName = faker.person.firstName()
        const lastName = faker.person.lastName()
        newUsers.push({
            name: `${firstName} ${lastName}`,
            email: faker.internet.email({ firstName, lastName, provider: 'skipq-fake.com' }),
            passwordHash: 'fake-hash',
            role: 'USER',
            phone: faker.phone.number({ style: 'national' })
        })
    }

    await prisma.user.createMany({ data: newUsers })
    console.log('Users created.')
}

// Generate the data structure for a single order
function generateOrderData(canteen: any, user: any, createdAt: Date, updatedAt: Date) {
    // 1. Items
    const itemCount = faker.number.int({ min: 1, max: 4 })
    const selectedItems = faker.helpers.arrayElements(canteen.menuItems, itemCount)
    
    let subtotalCents = 0
    let taxCents = 0
    
    const orderItemsData = selectedItems.map((item: any) => {
        const qty = faker.number.int({ min: 1, max: 2 })
        
        // Tax Calc
        const itemTotal = item.priceCents * qty
        let tax = 0
        let base = 0
        
        if (item.isTaxInclusive) {
            base = Math.round(itemTotal / (1 + (item.taxRate/100)))
            tax = itemTotal - base
        } else {
            tax = Math.round(itemTotal * (item.taxRate/100))
            base = itemTotal
            // itemTotal += tax (Not valid for this logic, we keep track separately)
        }
        
        subtotalCents += base
        taxCents += tax
        
        return {
            menuItemId: item.id,
            quantity: qty,
            priceCents: item.priceCents,
            taxRate: item.taxRate,
            taxAmountCents: Math.round(tax / qty), // Approximate
            totalCents: Math.round((base + tax) / qty) * qty // Re-normalize
        }
    })

    // 2. Fees
    const orderType = faker.helpers.arrayElement([OrderType.SELF_ORDER, OrderType.PRE_ORDER])
    let platformFeeRate = orderType === OrderType.PRE_ORDER 
        ? (canteen.vendor.preOrderFeeRate || 0.03) 
        : (canteen.vendor.selfOrderFeeRate || 0.015)
        
    const platformFeeAmount = Math.round(subtotalCents * platformFeeRate)
    
    const grandTotal = subtotalCents + taxCents + platformFeeAmount
    const vendorTake = subtotalCents + taxCents // Vendor gets tax too? Depends on model. 
    // Usually vendor gets (Subtotal + Tax) - Commission. 
    // In our schema: vendorTakeCents = default(0). 
    // Let's assume vendorTake = (Subtotal + Tax). Commission is PlatformFee.
    
    // 3. Status
    const statusRoll = Math.random()
    let status = 'COMPLETED'
    let paymentStatus = 'SUCCESS'
    
    if (statusRoll > 0.96) { status = 'CANCELLED'; paymentStatus = 'FAILED' } // 4% Cancelled
    else if (statusRoll > 0.98) { status = 'REFUNDED'; paymentStatus = 'REFUNDED' } // 2% Refunded

    return {
        user,
        canteen,
        items: orderItemsData,
        amounts: { subtotalCents, taxCents, platformFeeAmount, grandTotal, vendorTake },
        meta: { orderType, status, paymentStatus, createdAt, updatedAt, platformFeeRate }
    }
}

// Create the DB record
async function createOrderTransaction(data: any) {
    const { user, canteen, items, amounts, meta } = data
    
    return prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
            data: {
                idempotencyKey: faker.string.uuid(),
                userId: user.id,
                canteenId: canteen.id,
                vendorId: canteen.vendor.id,
                
                status: meta.status,
                source: 'SEED',
                fulfillmentType: 'TAKEAWAY',
                
                // Money
                subtotalCents: amounts.subtotalCents,
                taxCents: amounts.taxCents,
                commissionCents: amounts.platformFeeAmount,
                platformFeeAmount: amounts.platformFeeAmount,
                platformFeeRate: meta.platformFeeRate,
                totalCents: amounts.grandTotal,
                vendorTakeCents: amounts.vendorTake,
                
                // Meta
                orderType: meta.orderType,
                selectedOrderType: meta.orderType,
                createdAt: meta.createdAt,
                updatedAt: meta.updatedAt,
                
                // Relational
                items: { create: items },
                payment: {
                    create: {
                        amountCents: amounts.grandTotal,
                        status: meta.paymentStatus,
                        provider: 'SEED',
                        paidAt: meta.status === 'COMPLETED' ? meta.createdAt : null
                    }
                }
            }
        })

        // Ledger (Only for completed sales)
        if (meta.status === 'COMPLETED' || meta.status === 'REFUNDED') {
            await tx.ledgerEntry.create({
                data: {
                    vendorId: canteen.vendor.id,
                    orderId: order.id,
                    type: meta.status === 'REFUNDED' ? 'REFUND' : 'SALE',
                    paymentMode: 'SEED',
                    
                    grossAmount: amounts.grandTotal,
                    taxAmount: amounts.taxCents,
                    platformFee: amounts.platformFeeAmount,
                    netAmount: amounts.vendorTake, // Simplification
                    
                    orderType: meta.orderType,
                    platformFeeRate: meta.platformFeeRate,
                    settlementStatus: 'UNSETTLED',
                    timestamp: meta.createdAt
                }
            })
        }

        return order
    })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
