import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { InventoryService } from './inventory-service'
import { LedgerService } from './ledger-service'

// Types
export type OrderItemInput = {
    menuItemId: string
    quantity: number
    modifiers?: { modifierId: string; quantity: number }[] 
}

export type PlaceOrderInput = {
    vendorId: string
    canteenId: string
    userId?: string
    items: OrderItemInput[]
    source: 'ONLINE' | 'COUNTER'
    fulfillmentType: 'TAKEAWAY' | 'DINE_IN'
    paymentMode: 'CASH' | 'UPI' | 'RAZORPAY'
    idempotencyKey: string
    staffId?: string
    guestName?: string
}

export const OrderService = {
  async placeOrder(input: PlaceOrderInput) {
    const { vendorId, canteenId, items, source, idempotencyKey } = input
    
    // 1. Validate Basics
    if (!items.length) throw new Error('No items in order')

    // 2. START TRANSACTION
    return await prisma.$transaction(async (tx) => {
        // A. Idempotency Check (GAP 1 Fix)
        const existingOrder = await tx.order.findUnique({
            where: { idempotencyKey }
        })
        if (existingOrder) {
            return {
                success: true,
                orderId: existingOrder.id,
                duplicate: true
            }
        }

        // B. Fetch Menu Items & Validate Prices
        // We re-fetch to ensure the frontend didn't tamper with prices
        // and to capture the exact snapshot at this moment.
        const itemIds = items.map(i => i.menuItemId)
        const menuItems = await tx.menuItem.findMany({
            where: { id: { in: itemIds }, canteenId },
            include: { 
                modifierGroups: {
                    include: { modifiers: true }
                } 
            }
        })
        
        // C. Calculate Totals (Backend Source of Truth)
        let subtotalCents = 0
        let totalTaxCents = 0
        const orderItemsData = []

        for (const inputItem of items) {
            const dbItem = menuItems.find(m => m.id === inputItem.menuItemId)
            if (!dbItem) throw new Error(`Item ${inputItem.menuItemId} not found`)
            if (!dbItem.available) throw new Error(`Item ${dbItem.name} is unavailable`)

            // Base Price
            let itemTotal = dbItem.priceCents * inputItem.quantity
            let itemTax = 0

            // Modifiers Calculation
            // TODO: Implement strict modifier lookup if we passed modifier IDs
            // For now, assume pure item price logic or extend later.
            // Placeholder for modifiers:
            const modifiersSnapshot = [] // We would fetch and calc these too

            // Tax Calculation
            // Rule: base_price is either tax-inclusive or exclusive
            if (dbItem.isTaxInclusive) {
                // e.g. 105 total, 5% tax -> Price = 100, Tax = 5
                // Formula: Total / (1 + rate/100) = Base
                const taxRatio = dbItem.taxRate / 100
                const base = Math.round(itemTotal / (1 + taxRatio))
                itemTax = itemTotal - base
            } else {
                // Exclusive: 100 base, 5% tax -> Total = 105
                const taxRatio = dbItem.taxRate / 100
                itemTax = Math.round(itemTotal * taxRatio)
                itemTotal += itemTax
            }

            subtotalCents += (itemTotal - itemTax)
            totalTaxCents += itemTax

            orderItemsData.push({
                menuItemId: dbItem.id,
                quantity: inputItem.quantity,
                priceCents: dbItem.priceCents, // Base Unit Price Snapshot
                taxRate: dbItem.taxRate,
                taxAmountCents: Math.round(itemTax / inputItem.quantity), // Per unit approx
                totalCents: Math.round(itemTotal / inputItem.quantity),   // Per unit approx
                modifiersSnapshot: []
            })
        }

        const grandTotalCents = subtotalCents + totalTaxCents

        // D. Commission & Vendor Take
        // Hardcoded 0 for now or fetch from Vendor config
        const commissionCents = 0 
        const vendorTakeCents = grandTotalCents - commissionCents

        // E. Create Order (Pending)
        const order = await tx.order.create({
            data: {
                idempotencyKey,
                vendorId,
                canteenId,
                userId: input.userId,
                staffId: input.staffId,
                guestName: input.guestName,
                
                source,
                fulfillmentType: input.fulfillmentType,
                status: 'ACCEPTED', // or PENDING check if payment is needed

                subtotalCents,
                taxCents: totalTaxCents,
                totalCents: grandTotalCents,
                commissionCents,
                vendorTakeCents,

                items: {
                    create: orderItemsData
                },
                payment: {
                    create: {
                        amountCents: grandTotalCents,
                        provider: input.paymentMode,
                        status: input.paymentMode === 'CASH' ? 'SUCCESS' : 'PENDING' // Assuming cash is instant/verified by cashier
                    }
                }
            },
            include: {
                payment: true
            }
        })

        // F. Ledger Entry (Only if Confirmed/Cash)
        if (order.status === 'ACCEPTED' || order.payment?.status === 'SUCCESS') {
            await LedgerService.recordSale(tx, {
                id: order.id,
                vendorId: order.vendorId,
                totalCents: order.totalCents,
                taxCents: order.taxCents,
                commissionCents: order.commissionCents,
                vendorTakeCents: order.vendorTakeCents,
                payment: order.payment
            })
        }

        // G. Inventory Decrement (GAP 4 Fix: Same TX)
        // We only decrement if it's a confirmed order (or accepted).
        if (order.status === 'ACCEPTED') {
            await InventoryService.decrementStock(
                tx, 
                vendorId, 
                orderItemsData.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
                order.id,
                input.staffId || 'SYSTEM'
            )
        }

        return { success: true, orderId: order.id, duplicate: false }
    })
  }
}
