/**
 * Stress Test Script
 * 
 * Simulates 1000 orders to verify system performance and ledger integrity.
 * Mimics OrderService login without dependent imports to run via ts-node.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Configuration
const ORDER_COUNT = 1000
const BATCH_SIZE = 5 // Process in batches to avoid connection pool exhaustion

// Helper: Calculate Tax (Simplified version of tax-calculator.ts)
function calculateItemTax(params: { itemPriceCents: number, quantity: number, taxRate: number, isTaxInclusive: boolean }) {
  const { itemPriceCents, quantity, taxRate, isTaxInclusive } = params
  let itemTotal = itemPriceCents * quantity
  let taxAmount = 0
  let baseAmount = 0

  if (isTaxInclusive) {
    const taxRatio = taxRate / 100
    baseAmount = Math.round(itemTotal / (1 + taxRatio))
    taxAmount = itemTotal - baseAmount
  } else {
    const taxRatio = taxRate / 100
    taxAmount = Math.round(itemTotal * taxRatio)
    itemTotal += taxAmount
    baseAmount = itemTotal - taxAmount // Approximate
  }

  return { baseAmount, taxAmount, totalAmount: itemTotal }
}

// Helper: Calculate Platform Fee (Simplified version of billing.ts)
function calculatePlatformFee(params: { orderType: string, subtotalCents: number }) {
  const { orderType, subtotalCents } = params
  // Default logic: 3% for PRE_ORDER, 1.5% for SELF_ORDER
  const rate = orderType === 'PRE_ORDER' ? 0.03 : 0.015
  const amount = Math.round(subtotalCents * rate)
  return { platformFeeRate: rate, platformFeeAmount: amount }
}

async function main() {
  console.log(`\n=== Starting Stress Test: ${ORDER_COUNT} Orders ===\n`)

  // 1. Fetch Prerequisites
  const user = await prisma.user.findFirst()
  if (!user) throw new Error('No user found to mimic orderer')
  
  const canteen = await prisma.canteen.findFirst({ include: { vendor: true } })
  if (!canteen) throw new Error('No canteen found')
  if (!canteen.vendor) throw new Error('Canteen has no vendor')

  const menuItems = await prisma.menuItem.findMany({
    where: { canteenId: canteen.id, available: true },
    take: 10
  })
  if (menuItems.length === 0) throw new Error('No menu items found')

  console.log(`Using User: ${user.name} (${user.id})`)
  console.log(`Using Canteen: ${canteen.name} (${canteen.id})`)
  console.log(`Using Vendor: ${canteen.vendor.name} (${canteen.vendor.id})`)
  console.log(`Available Items: ${menuItems.length}\n`)

  const vendorId = canteen.vendorId

  // 2. Loop
  let completed = 0
  let failures = 0
  
  for (let i = 0; i < ORDER_COUNT; i += BATCH_SIZE) {
    const batchPromises = []
    const currentBatchSize = Math.min(BATCH_SIZE, ORDER_COUNT - i)
    
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${currentBatchSize} orders)...`)

    for (let j = 0; j < currentBatchSize; j++) {
      batchPromises.push(createSingleOrder(user.id, canteen.id, vendorId, menuItems))
    }

    const results = await Promise.allSettled(batchPromises)
    
    results.forEach(r => {
      if (r.status === 'fulfilled') completed++
      else {
        failures++
        console.error('Order failed:', r.reason)
      }
    })
  }

  console.log('\n=== Stress Test Complete ===')
  console.log(`Total Created: ${completed}`)
  console.log(`Total Failed: ${failures}`)
}

async function createSingleOrder(userId: string, canteenId: string, vendorId: string, menuItems: any[]) {
    // 1. Random Selection
    const itemCount = Math.floor(Math.random() * 3) + 1 // 1-3 items
    const selectedItems = []
    
    for (let k = 0; k < itemCount; k++) {
      const item = menuItems[Math.floor(Math.random() * menuItems.length)]
      selectedItems.push({
        menuItemId: item.id,
        quantity: Math.floor(Math.random() * 2) + 1 // 1-2 qty
      })
    }

    // 2. Calculations
    let subtotalCents = 0
    let totalTaxCents = 0
    const orderItemsData = []

    for (const inputItem of selectedItems) {
        const dbItem = menuItems.find((m: any) => m.id === inputItem.menuItemId)
        
        const { baseAmount, taxAmount, totalAmount } = calculateItemTax({
            itemPriceCents: dbItem.priceCents,
            quantity: inputItem.quantity,
            taxRate: dbItem.taxRate,
            isTaxInclusive: dbItem.isTaxInclusive
        })

        subtotalCents += baseAmount
        totalTaxCents += taxAmount

        orderItemsData.push({
            menuItemId: dbItem.id,
            quantity: inputItem.quantity,
            priceCents: dbItem.priceCents,
            taxRate: dbItem.taxRate,
            taxAmountCents: Math.round(taxAmount / inputItem.quantity),
            totalCents: Math.round(totalAmount / inputItem.quantity)
        })
    }

    const grandTotalCents = subtotalCents + totalTaxCents

    // Order Type (Default to SELF_ORDER for stress testing "normal" flow)
    const orderType = Math.random() > 0.3 ? 'SELF_ORDER' : 'PRE_ORDER' // 70% Self Order
    
    const { platformFeeRate, platformFeeAmount } = calculatePlatformFee({
        orderType,
        subtotalCents
    })

    const vendorTakeCents = subtotalCents + totalTaxCents
    const finalGrandTotal = grandTotalCents + platformFeeAmount

    // 3. DB Transaction
    // We simulate a successful payment immediately
    return await prisma.$transaction(async (tx) => {
        // Create Order
        const order = await tx.order.create({
            data: {
                idempotencyKey: `stress-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                userId,
                canteenId,
                vendorId,
                items: { create: orderItemsData },
                
                status: 'ACCEPTED', // Completed order
                source: 'STRESS_TEST',
                fulfillmentType: 'TAKEAWAY',
                
                subtotalCents,
                taxCents: totalTaxCents,
                totalCents: finalGrandTotal,
                commissionCents: platformFeeAmount,
                vendorTakeCents,

                selectedOrderType: orderType as any,
                orderType: orderType as any, 
                
                platformFeeRate,
                platformFeeAmount,

                payment: {
                    create: {
                        amountCents: finalGrandTotal,
                        provider: 'SIMULATOR',
                        status: 'SUCCESS'
                    }
                }
            },
            include: { payment: true }
        })

        // Create Ledger Entry (Logic matched from OrderService)
        // Only if SELF_ORDER and Paid/Accepted
        if (orderType === 'SELF_ORDER') {
            await tx.ledgerEntry.create({
                data: {
                    vendorId: order.vendorId!,
                    orderId: order.id,
                    type: 'SALE',
                    paymentMode: 'SIMULATOR',
                    grossAmount: order.totalCents,
                    taxAmount: order.taxCents,
                    platformFee: order.commissionCents,
                    netAmount: order.vendorTakeCents,
                    orderType: 'SELF_ORDER',
                    platformFeeRate: platformFeeRate,
                    settlementStatus: 'UNSETTLED',
                    timestamp: new Date() // Now
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
