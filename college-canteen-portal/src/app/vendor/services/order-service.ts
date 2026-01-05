import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { InventoryService } from './inventory-service'
import { LedgerService } from './ledger-service'
import { calculateDistance, determineOrderType, isLocationAccurate, OrderType } from '@/lib/geofencing'

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
    
    // User Intent for Order Type (optional, defaults to SELF_ORDER for counter orders)
    selectedOrderType?: 'SELF_ORDER' | 'PRE_ORDER'
    
    // Geofencing
    userLatitude?: number
    userLongitude?: number
    locationAccuracy?: number
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

        // D. Platform Fee Calculation & Order Type Resolution
        
        // Parse user-selected order type (default to SELF_ORDER for counter orders)
        const selectedOrderType = input.selectedOrderType === 'PRE_ORDER' 
            ? OrderType.PRE_ORDER 
            : OrderType.SELF_ORDER // Counter orders default to SELF_ORDER
        
        // Geofencing: Calculate Distance & Determine OrderType
        let userLatitude = input.userLatitude
        let userLongitude = input.userLongitude
        let locationAccuracy = input.locationAccuracy
        let distanceFromVendorMeters: number | null = null
        let vendorLocationAvailable = false

        // Fetch vendor location
        const vendor = await tx.vendor.findUnique({
            where: { id: vendorId },
            select: { latitude: true, longitude: true, geofenceRadiusMeters: true }
        } as any)
        
        // Check if vendor location is available
        if (vendor && vendor.latitude !== null && vendor.longitude !== null) {
            vendorLocationAvailable = true
            
            // Calculate distance if user location is provided
            if (userLatitude !== undefined && userLongitude !== undefined) {
                distanceFromVendorMeters = Math.floor(
                    calculateDistance(
                        userLatitude,
                        userLongitude,
                        vendor.latitude,
                        vendor.longitude
                    )
                )
            }
        }
        
        // Import and use resolveOrderType
        const { resolveOrderType } = await import('@/lib/geofencing')
        
        const resolution = resolveOrderType({
            selectedOrderType,
            distanceMeters: distanceFromVendorMeters,
            radiusMeters: vendor?.geofenceRadiusMeters || 5,
            locationAccuracy,
            vendorLocationAvailable
        })
        
        console.log('[GEOFENCE] Vendor Order classification:', {
            selectedOrderType,
            finalOrderType: resolution.finalOrderType,
            autoConverted: resolution.autoConverted,
            reason: resolution.autoConversionReason,
            distance: distanceFromVendorMeters
        })
        
        // Calculate platform fee based on final order type
        const { calculatePlatformFee } = await import('@/lib/billing')
        const { platformFeeRate, platformFeeAmount } = calculatePlatformFee({
            orderType: resolution.finalOrderType,
            subtotalCents
        })
        
        // Update totals with platform fee
        const commissionCents = platformFeeAmount
        const vendorTakeCents = subtotalCents + totalTaxCents
        const finalGrandTotal = subtotalCents + totalTaxCents + platformFeeAmount
        
        // F. Create Order (Pending)
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
                totalCents: finalGrandTotal,
                commissionCents,
                vendorTakeCents,
                
                // User Intent & Resolution
                selectedOrderType: selectedOrderType as any,
                orderType: resolution.finalOrderType,
                autoConverted: resolution.autoConverted,
                autoConversionReason: resolution.autoConversionReason,
                
                // Platform Fee Snapshot
                platformFeeRate,
                platformFeeAmount,

                items: {
                    create: orderItemsData
                },
                payment: {
                    create: {
                        amountCents: finalGrandTotal,
                        provider: input.paymentMode,
                        status: input.paymentMode === 'CASH' ? 'SUCCESS' : 'PENDING' // Assuming cash is instant/verified by cashier
                    }
                },
                // Geofencing Data
                userLatitude,
                userLongitude,
                locationAccuracy,
                distanceFromVendorMeters
            } as any,
            include: {
                payment: true
            }
        }) as any // Ensure payment relation is typed for subsequent checks

        // G. Ledger Entry
        // Record sale for ANY order that is confirmed/paid (SELF or PRE order)
        if (order.status === 'ACCEPTED' || order.payment?.status === 'SUCCESS') {
            await LedgerService.recordSale(tx, {
                id: order.id,
                vendorId: order.vendorId,
                totalCents: order.totalCents,
                taxCents: order.taxCents,
                commissionCents: order.commissionCents,
                vendorTakeCents: order.vendorTakeCents,
                orderType: resolution.finalOrderType,
                platformFeeRate,
                platformFeeAmount,
                payment: order.payment
            })
        }

        // H. Inventory Decrement (ONLY for SELF_ORDER that are accepted)
        // PRE_ORDER must NOT decrement inventory
        if (resolution.finalOrderType === OrderType.SELF_ORDER && order.status === 'ACCEPTED') {
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
