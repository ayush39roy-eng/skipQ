import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { 
      // Vendor Details
      vendorName, 
      phone, 
      mode, 
      
      // Account Credentials
      email, 
      password,
      
      // Canteen Details
      canteenName,
      location
    } = body

    // 1. Validation
    if (!email || !password || !vendorName || !canteenName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check existing email
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    // 2. Hash Password
    const passwordHash = await bcrypt.hash(password, 10)

    // 3. Atomic Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Vendor Profile
      const vendor = await tx.vendor.create({
        data: {
          name: vendorName,
          phone: phone || null,
          mode: mode || 'ORDERS_ONLY',
          status: 'ACTIVE'
        }
      })

      // Create User Account linked to Vendor
      const user = await tx.user.create({
        data: {
          email,
          name: vendorName, // Default to vendor name
          passwordHash,
          role: 'VENDOR',
          vendorId: vendor.id,
          phone: phone || null
        }
      })

      // Create Default Canteen
      const canteen = await tx.canteen.create({
        data: {
          name: canteenName,
          location: location || 'Main Campus',
          vendorId: vendor.id,
          autoMode: true,
          openingTime: "09:00",
          closingTime: "21:00",
          manualIsOpen: true
        }
      })

      return { vendor, user, canteen }
    })

    // 4. Audit Log (Gold Standard)
    const { logAudit } = await import('@/lib/audit')
    const { getRequestId, getClientIp } = await import('@/lib/request-context')
    
    await logAudit({
      action: 'VENDOR_CREATED',
      result: 'SUCCESS',
      severity: 'CRITICAL',
      entityType: 'VENDOR',
      entityId: result.vendor.id,
      authType: 'SESSION',
      authId: session.userId,
      method: 'POST',
      reqId: await getRequestId(),
      ip: await getClientIp(),
      after: result,
      metadata: { 
        adminEmail: session.user.email,
        createdUserEmail: email
      }
    })

    return NextResponse.json({ 
      success: true, 
      vendorId: result.vendor.id,
      message: 'Vendor created successfully' 
    })

  } catch (error) {
    console.error('[ADMIN-VENDOR-CREATE] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to create vendor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
