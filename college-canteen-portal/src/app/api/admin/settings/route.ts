import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings
 * Fetch platform settings
 */
export async function GET() {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let settings = await prisma.platformSettings.findFirst()

    if (!settings) {
      // Create default settings if not exists
      settings = await prisma.platformSettings.create({
        data: {
          platformGstRate: 0.18 // Default 18%
        }
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

/**
 * POST /api/admin/settings
 * Update platform settings
 */
export async function POST(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { platformGstRate } = body

    if (platformGstRate === undefined || platformGstRate === null) {
        return NextResponse.json({ error: 'GST Rate is required' }, { status: 400 })
    }

    // Upsert settings (update if exists, create if not)
    // Since we don't know the ID, we use findFirst then update or create
    let settings = await prisma.platformSettings.findFirst()
    const previousSettings = settings ? { ...settings } : undefined

    if (settings) {
      settings = await prisma.platformSettings.update({
        where: { id: settings.id },
        data: {
          platformGstRate: parseFloat(platformGstRate),
          // @ts-ignore - ordersPaused is recently added
          ordersPaused: body.ordersPaused !== undefined ? body.ordersPaused : undefined,
          updatedBy: session.userId
        }
      })
    } else {
      settings = await prisma.platformSettings.create({
        data: {
          platformGstRate: parseFloat(platformGstRate),
          updatedBy: session.userId
        }
      })
    }

    // Audit Log
    const { logAudit } = await import('@/lib/audit')
    const { getRequestId, getClientIp } = await import('@/lib/request-context')
    
    await logAudit({
      action: 'PLATFORM_SETTINGS_UPDATE',
      result: 'SUCCESS',
      severity: 'CRITICAL', // Affects global revenue
      entityType: 'SYSTEM',
      entityId: settings.id,
      authType: 'SESSION',
      authId: session.userId,
      method: 'POST',
      reqId: await getRequestId(),
      ip: await getClientIp(),
      before: previousSettings,
      after: settings,
      metadata: { changes: body }
    })

    return NextResponse.json({ settings, message: 'Settings updated successfully' })
  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
