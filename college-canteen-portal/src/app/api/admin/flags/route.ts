import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Feature Flags (Stub)
 * GET /api/admin/flags
 */
export async function GET(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch global flags from settings
    let settings = await prisma.platformSettings.findFirst()
    
    // Initialize if not exists
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {
          globalFlags: [
            {
              key: 'ENABLE_PRE_ORDERS',
              name: 'Enable Pre-Orders',
              description: 'Allow users to place orders in advance',
              enabled: true,
              type: 'GLOBAL'
            },
            {
              key: 'ENABLE_VENDOR_ANALYTICS',
              name: 'Vendor Analytics',
              description: 'Advanced analytics dashboard for vendors',
              enabled: false,
              type: 'GLOBAL'
            }
          ]
        }
      })
    }

    // Return stored flags
    const flags = settings.globalFlags || []

    return NextResponse.json({ flags })

  } catch (error) {
    console.error('[ADMIN-FLAGS] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch flags',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Update Feature Flag (Stub)
 * PATCH /api/admin/flags
 */
export async function PATCH(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { key, enabled } = body

    const settings = await prisma.platformSettings.findFirst()
    
    if (!settings || !Array.isArray(settings.globalFlags)) {
      return NextResponse.json({ error: 'Settings not initialized' }, { status: 404 })
    }

    const currentFlags = settings.globalFlags as any[]
    const updatedFlags = currentFlags.map(flag => 
      flag.key === key ? { ...flag, enabled } : flag
    )

    await prisma.platformSettings.update({
      where: { id: settings.id },
      data: {
        globalFlags: updatedFlags
      }
    })

    // Log action
    await prisma.adminActionLog.create({
      data: {
        adminId: session.userId,
        vendorId: session.userId, // System action, linking to admin
        actionType: 'UPDATE_FEATURE_FLAG',
        newMode: `${key}=${enabled}`
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[ADMIN-FLAGS] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to update flag',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
