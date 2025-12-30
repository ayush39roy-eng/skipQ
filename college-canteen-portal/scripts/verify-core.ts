
import { prisma } from '../src/lib/prisma'
import { OrderService } from '../src/app/vendor/services/order-service'
import { LedgerService } from '../src/app/vendor/services/ledger-service'

async function main() {
    console.log('--- STARTING VERIFICATION ---')

    // 0. CLEANUP (Optional, for repeatable tests)
    // await prisma.ledgerEntry.deleteMany()
    // await prisma.order.deleteMany()
    
    // 1. SETUP: Create Vendor, Canteen, Inventory, Menu
    console.log('1. Setting up Test Data...')
    const vendor = await prisma.vendor.create({
        data: { name: 'Audit Test Vendor', phone: '9999999999' }
    })
    
    const canteen = await prisma.canteen.create({
        data: { vendorId: vendor.id, name: 'Audit Canteen', location: 'Test Loc' }
    })

    // Inventory Item: Milk (Unit: Liter, Stock: 10)
    const milk = await prisma.inventoryItem.create({
        data: {
            vendorId: vendor.id,
            name: 'Milk',
            category: 'DAIRY',
            unit: 'L',
            quantity: 10.0,
            costPerUnit: 5000 // 50.00
        }
    })

    // Menu Item: Coffee (Requires 0.2L Milk, Price: 20.00, Tax Inclusive)
    const coffee = await prisma.menuItem.create({
        data: {
            canteenId: canteen.id,
            name: 'Coffee',
            priceCents: 2000, // 20.00
            isTaxInclusive: true, // 19.05 + 0.95 tax (approx at 5%)
            taxRate: 5.0,
            recipe: {
                create: {
                    items: {
                        create: {
                            inventoryItemId: milk.id,
                            quantity: 0.2
                        }
                    }
                }
            }
        }
    })

    console.log(`> Setup Complete. Vendor: ${vendor.id}, Item: ${coffee.id}`)

    // 2. PLACE ORDER
    console.log('2. Placing Order for 2 Coffees...')
    const idempotencyKey = `TEST-KEY-${Date.now()}`
    
    const result = await OrderService.placeOrder({
        vendorId: vendor.id,
        canteenId: canteen.id,
        items: [{ menuItemId: coffee.id, quantity: 2 }],
        source: 'ONLINE',
        fulfillmentType: 'TAKEAWAY',
        paymentMode: 'UPI',
        idempotencyKey
    })

    if (!result.success || !result.orderId) {
        throw new Error('Order Placement Failed: ' + JSON.stringify(result))
    }
    console.log(`> Order Placed: ${result.orderId}`)

    // 3. VERIFY ORDER & CALCULATIONS
    const order = await prisma.order.findUnique({
        where: { id: result.orderId },
        include: { items: true, payment: true, ledgerEntries: true }
    })
    
    if(!order) throw new Error('Order not found in DB')
    
    console.log('3. Verifying Order Calculations...')
    console.log(`   Total: ${order.totalCents} (Exp: 4000)`)
    console.log(`   Tax:   ${order.taxCents} (Exp: ~190)`) // 2000 * 2 = 4000. 4000/1.05 = 3809.5 -> 3810. Tax = 190.
    
    // 4. VERIFY LEDGER
    console.log('4. Verifying Ledger...')
    const ledger = order.ledgerEntries[0]
    if (!ledger) throw new Error('No Ledger Entry Created!')
    
    console.log(`   Ledger Type: ${ledger.type}`)
    console.log(`   Ledger Gross: ${ledger.grossAmount}`)
    console.log(`   Ledger Net: ${ledger.netAmount}`)
    
    if (ledger.grossAmount !== 4000) throw new Error('Ledger Mismatch')

    // 5. VERIFY INVENTORY DECREMENT
    console.log('5. Verifying Inventory...')
    const updatedMilk = await prisma.inventoryItem.findUnique({ where: { id: milk.id } })
    
    // Initial 10.0 - (0.2 * 2) = 9.6
    console.log(`   Milk Stock: ${updatedMilk?.quantity} (Exp: 9.6)`)
    
    if (Math.abs((updatedMilk?.quantity || 0) - 9.6) > 0.001) {
        throw new Error('Inventory Failed to Decrement Correctly')
    }

    // 6. VERIFY INVENTORY LOG
    const log = await prisma.inventoryLog.findFirst({
        where: { inventoryItemId: milk.id, referenceId: order.id }
    })
    if (!log) throw new Error('No Inventory Log found')
    console.log(`   Log: ${log.changeAmount} reason: ${log.reason}`)

    // 7. VERIFY IDEMPOTENCY
    console.log('6. Verifying Idempotency...')
    const duplicateParams = {
        vendorId: vendor.id,
        canteenId: canteen.id,
        items: [{ menuItemId: coffee.id, quantity: 2 }],
        source: 'ONLINE', // @ts-ignore
        fulfillmentType: 'TAKEAWAY', // @ts-ignore
        paymentMode: 'UPI',
        idempotencyKey
    }

    const dupResult = await OrderService.placeOrder(duplicateParams)
    console.log(`   Duplicate Call Result:`, dupResult)
    
    // @ts-ignore
    if (dupResult.orderId === order.id && dupResult.duplicate === true) {
        console.log('SUCCESS: Idempotency enforced. Returned existing order.')
    } else {
        throw new Error('Idempotency Failed!')
    }

    // 8. TEARDOWN (Clean up the test mess)
    console.log('--- CLEANING UP ---')
    await prisma.ledgerEntry.deleteMany({ where: { vendorId: vendor.id } })
    await prisma.inventoryLog.deleteMany({ where: { inventoryItemId: milk.id } })
    await prisma.recipeItem.deleteMany({ where: { inventoryItemId: milk.id } })
    await prisma.recipe.deleteMany({ where: { menuItemId: coffee.id } })
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } })
    await prisma.payment.delete({ where: { orderId: order.id } })
    await prisma.order.delete({ where: { id: order.id } })
    await prisma.menuItem.delete({ where: { id: coffee.id } })
    await prisma.inventoryItem.delete({ where: { id: milk.id} })
    await prisma.canteen.delete({ where: { id: canteen.id } })
    await prisma.vendor.delete({ where: { id: vendor.id } })
    
    console.log('--- VERIFICATION SUCCESSFUL ---')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
