import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { calculateCommissionSplit } from '@/lib/billing'
import { checkCanteenStatus } from '@/lib/canteen-utils'
import { calculateDistance, determineOrderType, isLocationAccurate, OrderType } from '@/lib/geofencing'

type FulfillmentType = 'TAKEAWAY' | 'DINE_IN'

type OrderItemPayload = {
  menuItemId: string
  quantity: number
}

type OrderRequestBody = {
  canteenId: string
  items: OrderItemPayload[]
  fulfillmentType?: FulfillmentType
  cookingInstructions?: string
  
  // User Intent for Order Type
  selectedOrderType?: 'SELF_ORDER' | 'PRE_ORDER'
  
  // Geofencing fields
  userLatitude?: number
  userLongitude?: number
  locationAccuracy?: number
}

function isOrderItemPayload(value: unknown): value is OrderItemPayload {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.menuItemId === 'string' && typeof item.quantity === 'number' && item.quantity > 0 && item.quantity <= 100
}

function parseOrderBody(payload: unknown): OrderRequestBody | null {
  if (!payload || typeof payload !== 'object') return null
  const body = payload as Record<string, unknown>
  if (typeof body.canteenId !== 'string' || !Array.isArray(body.items)) return null
  const items = body.items.filter(isOrderItemPayload)
  if (!items.length) return null
  const rawMode = typeof body.fulfillmentType === 'string' ? body.fulfillmentType.toUpperCase() : undefined
  const fulfillmentType: FulfillmentType | undefined = rawMode === 'DINE_IN' ? 'DINE_IN' : rawMode === 'TAKEAWAY' ? 'TAKEAWAY' : undefined
  const cookingInstructions = typeof body.cookingInstructions === 'string' ? String(body.cookingInstructions) : undefined
  
  // Parse user-selected order type
  const rawOrderType = typeof body.selectedOrderType === 'string' ? body.selectedOrderType.toUpperCase() : undefined
  const selectedOrderType: 'SELF_ORDER' | 'PRE_ORDER' | undefined = 
    rawOrderType === 'SELF_ORDER' ? 'SELF_ORDER' : 
    rawOrderType === 'PRE_ORDER' ? 'PRE_ORDER' : undefined
  
  // Parse geofencing location data
  const userLatitude = typeof body.userLatitude === 'number' ? body.userLatitude : undefined
  const userLongitude = typeof body.userLongitude === 'number' ? body.userLongitude : undefined
  const locationAccuracy = typeof body.locationAccuracy === 'number' ? body.locationAccuracy : undefined
  
  return { 
    canteenId: body.canteenId, 
    items, 
    fulfillmentType, 
    cookingInstructions,
    selectedOrderType,
    userLatitude,
    userLongitude,
    locationAccuracy
  }
}

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await requireRole(['USER'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Require idempotency key to prevent duplicate orders from network retries
  const idempotencyKey = req.headers.get('x-idempotency-key')
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'Missing X-Idempotency-Key header' }, { status: 400 })
  }

  // Validate idempotency key format (should be UUID or similar)
  if (idempotencyKey.length < 16 || idempotencyKey.length > 64) {
    return NextResponse.json({ error: 'Invalid idempotency key format' }, { status: 400 })
  }

  // Check for existing order with this idempotency key for this user
  const existingOrder = await prisma.order.findFirst({
    where: { 
      idempotencyKey,
      userId: session.userId 
    },
    include: {
      payment: true,
      items: { include: { menuItem: true } }
    }
  })

  if (existingOrder) {
    // Return cached response for duplicate request
    return NextResponse.json({
      id: existingOrder.id,
      amount: existingOrder.totalCents,
      currency: 'INR',
      payment: existingOrder.payment ? {
        id: existingOrder.payment.id,
        status: existingOrder.payment.status,
        razorpayOrderId: existingOrder.payment.provider === 'razorpay' ? existingOrder.payment.externalOrderId : undefined,
        keyId: existingOrder.payment.provider === 'razorpay' ? process.env.RAZORPAY_KEY_ID : undefined
      } : null,
      _idempotent: true // Flag indicating this is a cached response
    })
  }

  const body = parseOrderBody(await req.json())
  if (!body) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  const { canteenId, items, fulfillmentType, cookingInstructions, selectedOrderType } = body
  
  // Parse selectedOrderType with default to PRE_ORDER if not provided
  const userSelectedOrderType = selectedOrderType === 'SELF_ORDER' 
    ? OrderType.SELF_ORDER 
    : OrderType.PRE_ORDER

  const menuItems = await prisma.menuItem.findMany({ 
    where: { 
      id: { in: items.map((i) => i.menuItemId) }, 
      canteenId, 
      available: true 
    },
    select: {
      id: true,
      priceCents: true,
      taxRate: true,
      isTaxInclusive: true,
      available: true
    }
  })
  if (menuItems.length !== items.length) {
    // Some items were not found or are unavailable
    return NextResponse.json({ error: 'One or more items are unavailable or invalid' }, { status: 400 })
  }

  // Calculate food subtotal and tax using tax calculator
  const { calculateItemTax } = await import('@/lib/tax-calculator')
  
  let foodSubtotal = 0  // Pure item prices (excluding tax)
  let foodTaxAmount = 0  // Total tax amount
  const orderItems = items.map((item) => {
    const mi = menuItems.find((m) => m.id === item.menuItemId)
    if (!mi) return null
    
    // Calculate tax for this item
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
      taxAmountCents: Math.round(taxResult.taxAmount / item.quantity),  // Per unit
      totalCents: Math.round(taxResult.totalAmount / item.quantity)  // Per unit
    }
  }).filter(Boolean) as Array<{ menuItemId: string, quantity: number, priceCents: number, taxRate: number, taxAmountCents: number, totalCents: number }>

  const canteen = await prisma.canteen.findUnique({
    where: { id: canteenId },
    include: { vendor: true }
  })
  if (!canteen) return NextResponse.json({ error: 'Canteen not found' }, { status: 404 })

  // CHECK OPS SAFETY: Global Platform Pause
  const platformSettings = await prisma.platformSettings.findFirst()
  // @ts-ignore - ordersPaused is recently added
  if (platformSettings?.ordersPaused) {
    return NextResponse.json({ error: 'System is currently paused. No new orders accepted.' }, { status: 503 })
  }

  // CHECK OPS SAFETY: Vendor Suspension
  // @ts-ignore - status is recently added
  if (canteen.vendor.status === 'SUSPENDED') {
    return NextResponse.json({ error: 'This vendor is currently suspended.' }, { status: 403 })
  }

  const status = checkCanteenStatus(canteen)
  if (!status.isOpen) {
    return NextResponse.json({ error: `Canteen is closed. ${status.message}` }, { status: 400 })
  }

  // GEOFENCING: Calculate distance and check vendor location availability
  const { userLatitude, userLongitude, locationAccuracy } = body
  console.log('[DEBUG] Received location data:', { userLatitude, userLongitude, locationAccuracy, selectedOrderType })
  
  let distanceFromVendorMeters: number | null = null
  
  // Use type assertion for vendor location fields since they were added to schema
  const vendorLat = (canteen.vendor as any)?.latitude
  const vendorLng = (canteen.vendor as any)?.longitude
  const geofenceRadius = (canteen.vendor as any)?.geofenceRadiusMeters || 50

  // Simple geofencing logic
  let resolution = {
    selectedOrderType: userSelectedOrderType,
    finalOrderType: userSelectedOrderType,
    autoConverted: false,
    autoConversionReason: null as string | null
  }

  if (userSelectedOrderType === 'SELF_ORDER' && userLatitude && userLongitude && vendorLat && vendorLng) {
    // Calculate distance
    distanceFromVendorMeters = calculateDistance(userLatitude, userLongitude, vendorLat, vendorLng)
    
    if (distanceFromVendorMeters > geofenceRadius) {
      // Auto-convert to PRE_ORDER if outside geofence
      resolution = {
        selectedOrderType: userSelectedOrderType,
        finalOrderType: 'PRE_ORDER' as any, // Enum value
        autoConverted: true,
        autoConversionReason: 'outside_geofence'
      }
    }
  }

  console.log('[GEOFENCE] Order type resolution:', {
    selectedOrderType: userSelectedOrderType,
    finalOrderType: resolution.finalOrderType,
    autoConverted: resolution.autoConverted,
    reason: resolution.autoConversionReason,
    distance: distanceFromVendorMeters
  })
  
  // Calculate platform fee based on final order type
  const { calculatePlatformFee } = await import('@/lib/billing')
  const { platformFeeRate, platformFeeAmount } = calculatePlatformFee({
    orderType: resolution.finalOrderType,
    subtotalCents: foodSubtotal  // Platform fee calculated on food subtotal (excluding tax)
  })
  
  // Calculate final totals
  const vendorReceivable = foodSubtotal + foodTaxAmount  // What vendor gets
  const totalPayable = foodSubtotal + foodTaxAmount + platformFeeAmount  // What user pays
  
  console.log('[PRICING] Order totals:', {
    foodSubtotal,
    foodTaxAmount,
    platformFeeRate,
    platformFeeAmount,
    vendorReceivable,
    totalPayable
  })

  const order = await prisma.order.create({
    data: {
      idempotencyKey,
      userId: session.userId,
      canteenId: canteen.id,
      vendorId: canteen.vendorId, // Assuming vendor.id is canteen.vendorId from original context
      source: 'ONLINE',
      fulfillmentType: fulfillmentType ?? 'TAKEAWAY',
      
      // Billing Snapshot
      subtotalCents: foodSubtotal, // Using existing foodSubtotal
      taxCents: foodTaxAmount, // Using existing foodTaxAmount
      totalCents: totalPayable, // Using existing totalPayable
      commissionCents: platformFeeAmount,
      vendorTakeCents: vendorReceivable,  // What vendor gets (food + tax)
      
      // Platform Fee Tracking
      platformFeeRate: platformFeeRate as any, // Retaining as any from original
      platformFeeAmount,
      
      // Geofencing & Order Type Tracking
      selectedOrderType: userSelectedOrderType, // Using existing userSelectedOrderType
      orderType: resolution.finalOrderType, // Using existing resolution.finalOrderType
      autoConverted: resolution.autoConverted,
      autoConversionReason: resolution.autoConversionReason,
      
      distanceFromVendorMeters,

      items: {
        create: orderItems
      }
    } as any
  })

  // Initialize Payment
  const hasRazorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  let externalOrderId: string | undefined
  let paymentRecord
  const paymentLink = `/pay/${order.id}`

  if (hasRazorpay) {
    try {
      const { createRazorpayOrder } = await import('@/lib/razorpay')
      const rzpOrder = await createRazorpayOrder({
        orderId: order.id,
        amountCents: order.totalCents,
        currency: 'INR',
        notes: {
          userId: session.userId,
          userEmail: session.user.email
        }
      })
      externalOrderId = rzpOrder.id

      paymentRecord = await prisma.payment.create({
        data: {
          orderId: order.id,
          amountCents: order.totalCents,
          paymentLink,
          provider: 'razorpay',
          externalOrderId
        }
      })
    } catch (error) {
      console.error('Failed to initialize Razorpay order:', error)
      // Don't fail the order creation, just log error. User can retry payment later.
    }
  } 
  
  if (!paymentRecord) {
    // Manual payment fallback (or if Razorpay failed)
    paymentRecord = await prisma.payment.create({
      data: {
        orderId: order.id,
        amountCents: order.totalCents,
        paymentLink,
        provider: 'manual'
      }
    })
  }

  return NextResponse.json({
    id: order.id,
    amount: order.totalCents,
    currency: 'INR',
    
    // Detailed Pricing Breakdown for Frontend Display
    pricing: {
      foodSubtotal,  // In cents
      foodTaxAmount,  // In cents
      platformFeeRate,  // 0.015 or 0.03
      platformFeeAmount,  // In cents
      vendorReceivable,  // In cents (what vendor gets)
      totalPayable  // In cents (what user pays)
    },
    
    // Auto-conversion feedback (for frontend to display message)
    orderTypeConverted: resolution.autoConverted,
    conversionReason: resolution.autoConversionReason,
    finalOrderType: resolution.finalOrderType,
    distanceMeters: distanceFromVendorMeters,
    
    payment: {
        id: paymentRecord.id,
        status: paymentRecord.status,
        razorpayOrderId: paymentRecord.provider === 'razorpay' ? paymentRecord.externalOrderId : undefined,
        keyId: paymentRecord.provider === 'razorpay' ? process.env.RAZORPAY_KEY_ID : undefined
    }
  })
}

export async function GET() {
  const session = await requireRole(['USER'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orders = await prisma.order.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      payment: true,
      canteen: true,
      items: {
        include: {
          menuItem: true
        }
      }
    }
  })
  return NextResponse.json(orders)
}
