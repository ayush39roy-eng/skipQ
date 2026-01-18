
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { checkCanteenStatus } from '@/lib/canteen-utils'
import { calculateDistance, OrderType } from '@/lib/geofencing'
import { calculateItemTax } from '@/lib/tax-calculator'
import { calculatePlatformFee } from '@/lib/billing'

export const dynamic = 'force-dynamic'

type FulfillmentType = 'TAKEAWAY' | 'DINE_IN'

// Helper to validate items
function isOrderItemPayload(value: unknown): value is { menuItemId: string, quantity: number } {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.menuItemId === 'string' && typeof item.quantity === 'number' && item.quantity > 0
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(['USER'])
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Optional: Accept client-side idempotency key for INTENT creation to prevent double-tap creates
    // const idempotencyKey = req.headers.get('x-idempotency-key') 

    const body = await req.json()
    const { canteenId, items, fulfillmentType, cookingInstructions, selectedOrderType, userLatitude, userLongitude, locationAccuracy } = body

    if (!canteenId || !Array.isArray(items) || !items.length) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // 1. Validate Canteen & Items
    const canteen = await prisma.canteen.findUnique({
      where: { id: canteenId },
      include: { vendor: true }
    })
    if (!canteen) return NextResponse.json({ error: 'Canteen not found' }, { status: 404 })

    // Check Status
    // @ts-ignore
    if (canteen.vendor.status === 'SUSPENDED') return NextResponse.json({ error: 'Vendor suspended' }, { status: 403 })
    const status = checkCanteenStatus(canteen)
    if (!status.isOpen) return NextResponse.json({ error: `Canteen is closed. ${status.message}` }, { status: 400 })

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: items.map((i: any) => i.menuItemId) },
        canteenId,
        available: true
      }
    })
    if (menuItems.length !== items.length) {
      return NextResponse.json({ error: 'Some items are unavailable' }, { status: 400 })
    }

    // 2. Geofencing & Order Type Resolution
    let distanceFromVendorMeters: number | null = null
    const vendorLat = (canteen.vendor as any)?.latitude
    const vendorLng = (canteen.vendor as any)?.longitude
    const geofenceRadius = (canteen.vendor as any)?.geofenceRadiusMeters || 50
    
    // Default to PRE_ORDER if not specified
    let finalOrderType = selectedOrderType === 'SELF_ORDER' ? OrderType.SELF_ORDER : OrderType.PRE_ORDER
    let autoConverted = false
    let autoConversionReason = null

    if (finalOrderType === OrderType.SELF_ORDER && userLatitude && userLongitude && vendorLat && vendorLng) {
       distanceFromVendorMeters = calculateDistance(userLatitude, userLongitude, vendorLat, vendorLng)
       if (distanceFromVendorMeters > geofenceRadius) {
         finalOrderType = OrderType.PRE_ORDER
         autoConverted = true
         autoConversionReason = 'outside_geofence'
       }
    }

    // 3. Calculate Totals
    let foodSubtotal = 0
    let foodTaxAmount = 0
    const orderItemsSnapshot = items.map((item: any) => {
        const mi = menuItems.find(m => m.id === item.menuItemId)!
        const taxResult = calculateItemTax({
            itemPriceCents: mi.priceCents,
            quantity: item.quantity,
            taxRate: mi.taxRate,
            isTaxInclusive: mi.isTaxInclusive
        })
        foodSubtotal += taxResult.baseAmount
        foodTaxAmount += taxResult.taxAmount
        return {
            menuItemId: mi.id,
            quantity: item.quantity,
            priceCents: mi.priceCents,
            taxRate: mi.taxRate,
            taxAmountCents: Math.round(taxResult.taxAmount / item.quantity),
            totalCents: Math.round(taxResult.totalAmount / item.quantity)
        }
    })

    const { platformFeeRate, platformFeeAmount } = calculatePlatformFee({
        orderType: finalOrderType,
        subtotalCents: foodSubtotal
    })

    const totalPayable = foodSubtotal + foodTaxAmount + platformFeeAmount

    // 4. Create PaymentIntent (PENDING)
    const paymentIntent = await prisma.paymentIntent.create({
        data: {
            userId: session.userId,
            canteenId: canteen.id,
            itemsSnapshot: orderItemsSnapshot,
            fulfillmentType: fulfillmentType || 'TAKEAWAY',
            locationData: {
                userLatitude, userLongitude, locationAccuracy, 
                distanceFromVendorMeters,
                selectedOrderType,
                finalOrderType,
                autoConverted,
                autoConversionReason,
                cookingInstructions
            } as any, // Storing strict typed analysis in JSON
            amountCents: totalPayable,
            status: 'PENDING'
        }
    })

    // 5. Initialize Razorpay (if configured)
    let razorpayOrderId = undefined
    const hasRazorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    
    if (hasRazorpay) {
        try {
            const { createRazorpayOrder } = await import('@/lib/razorpay')
            const rzpOrder = await createRazorpayOrder({
                orderId: paymentIntent.id, // Use Intent ID as reference
                amountCents: totalPayable,
                currency: 'INR',
                notes: {
                    userId: session.userId,
                    type: 'payment_intent'
                }
            })
            razorpayOrderId = rzpOrder.id
            
            // Update Intent with RZP Order ID
            await prisma.paymentIntent.update({
                where: { id: paymentIntent.id },
                data: { paymentProviderOrderId: razorpayOrderId }
            })
        } catch (e) {
            console.error('Failed to create Razorpay order', e)
            // We can proceed without RZP ID (simulation fallback) or fail. 
            // For now, allow proceed, client might use simulation.
        }
    }

    return NextResponse.json({
        id: paymentIntent.id,
        amount: totalPayable,
        currency: 'INR',
            
        // Pricing breakdown
        pricing: {
            foodSubtotal,
            foodTaxAmount,
            platformFeeAmount,
            totalPayable
        },
        
        // Geofencing info
        orderTypeConverted: autoConverted,
        conversionReason: autoConversionReason,
        finalOrderType,
        
        payment: {
            razorpayOrderId,
            keyId: process.env.RAZORPAY_KEY_ID
        }
    })

  } catch (error: any) {
    console.error('Create PaymentIntent Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
