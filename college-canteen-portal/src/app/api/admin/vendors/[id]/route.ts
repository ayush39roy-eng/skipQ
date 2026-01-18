import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Get Vendor Detail
 * GET /api/admin/vendors/[id]
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        canteens: {
          select: {
            id: true,
            name: true,
            location: true,
            manualIsOpen: true
          }
        }
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    return NextResponse.json({
      vendor: {
        ...vendor,
        createdAt: vendor.createdAt.toISOString(),
        feeConfigUpdatedAt: vendor.feeConfigUpdatedAt ? vendor.feeConfigUpdatedAt.toISOString() : null,
        // @ts-ignore - canteens is a relation
        canteens: vendor.canteens
      }
    })

  } catch (error) {
    console.error('[ADMIN-VENDOR-DETAIL] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch vendor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Update Vendor Settings
 * PATCH /api/admin/vendors/[id]
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    const {
      name,
      phone,
      whatsappEnabled,
      // Location
      latitude,
      longitude,
      geofenceRadiusMeters,
      // Pricing
      feePayer,
      selfOrderFeeRate,
      preOrderFeeRate,
      // Feature Flags
      enableScheduledOrders,
      enableVendorPaidFees,
      enableAdvancedAnalytics,
      enablePricingOverrides,
      mode
    } = body

    // Validate fee rates if provided
    if (selfOrderFeeRate !== undefined && (selfOrderFeeRate < 0 || selfOrderFeeRate > 0.1)) {
      return NextResponse.json({ 
        error: 'Self-order fee rate must be between 0% and 10%' 
      }, { status: 400 })
    }

    if (preOrderFeeRate !== undefined && (preOrderFeeRate < 0 || preOrderFeeRate > 0.1)) {
      return NextResponse.json({ 
        error: 'Pre-order fee rate must be between 0% and 10%' 
      }, { status: 400 })
    }

    // Check if pricing config is being updated
    const pricingUpdated = 
      feePayer !== undefined || 
      selfOrderFeeRate !== undefined || 
      preOrderFeeRate !== undefined

    // Fetch existing vendor for 'before' snapshot
    const existingVendor = await prisma.vendor.findUnique({ where: { id } })
    if (!existingVendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(whatsappEnabled !== undefined && { whatsappEnabled }),
        ...(mode !== undefined && { mode }),
        // Location
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(geofenceRadiusMeters !== undefined && { geofenceRadiusMeters }),
        // Pricing
        ...(feePayer !== undefined && { feePayer }),
        ...(selfOrderFeeRate !== undefined && { selfOrderFeeRate }),
        ...(preOrderFeeRate !== undefined && { preOrderFeeRate }),
        ...(pricingUpdated && { feeConfigUpdatedAt: new Date() }),
        // Feature Flags
        ...(enableScheduledOrders !== undefined && { enableScheduledOrders }),
        ...(enableVendorPaidFees !== undefined && { enableVendorPaidFees }),
        ...(enableAdvancedAnalytics !== undefined && { enableAdvancedAnalytics }),
        ...(enablePricingOverrides !== undefined && { enablePricingOverrides }),
        // @ts-ignore - status is recently added
        ...(body.status !== undefined && { status: body.status })
      }
    })

    // Audit Log (Gold Standard)
    const { logAudit } = await import('@/lib/audit')
    const { getRequestId, getClientIp } = await import('@/lib/request-context')
    
    // Determine severity based on what changed
    const isCritical = pricingUpdated || enableVendorPaidFees !== undefined || feePayer !== undefined || mode !== undefined
    const severity = isCritical ? 'CRITICAL' : 'INFO'

    await logAudit({
      action: 'VENDOR_UPDATE',
      result: 'SUCCESS',
      severity,
      entityType: 'VENDOR',
      entityId: id,
      authType: 'SESSION',
      authId: session.userId,
      method: 'PATCH',
      reqId: await getRequestId(),
      ip: await getClientIp(),
      before: existingVendor,
      after: updatedVendor,
      metadata: { changes: body }
    })

    return NextResponse.json({
      success: true,
      vendor: updatedVendor
    })

  } catch (error) {
    console.error('[ADMIN-VENDOR-UPDATE] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to update vendor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
