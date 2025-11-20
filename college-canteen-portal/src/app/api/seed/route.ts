import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Dynamic to access env + perform writes at request time
export const dynamic = 'force-dynamic'

// GET /api/seed?token=YOUR_TOKEN
// Only runs if no ADMIN user exists yet. Use once, then delete this file.
export async function GET(req: Request) {
  const enabled = (process.env.ENABLE_SEED_ROUTE || '').toLowerCase() === 'true'
  if (!enabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const url = new URL(req.url)
  const token = (url.searchParams.get('token') || '').trim()
  const resetAdmin = ((url.searchParams.get('reset') || '').toLowerCase()) === 'true'
  const expected = (process.env.SEED_TOKEN || '').trim()
  if (!expected) return NextResponse.json({ error: 'SEED_TOKEN not set on server' }, { status: 500 })
  if (token !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (existingAdmin && !resetAdmin) {
    return NextResponse.json({ error: 'Already seeded', admin: existingAdmin.email }, { status: 409 })
  }
  try {
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'skipq@dtu29'
    const adminPass = await bcrypt.hash(adminPassword, 10)
    if (existingAdmin && resetAdmin) {
      const admin = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { email: 'admin@skipq.live', name: 'Admin', passwordHash: adminPass, role: 'ADMIN' },
      })
      return NextResponse.json({
        ok: true,
        reset: true,
        credentials: {
          admin: { email: admin.email, password: adminPassword },
        },
      })
    }

    const admin = await prisma.user.create({ data: { email: 'admin@skipq.live', name: 'Admin', passwordHash: adminPass, role: 'ADMIN' } })

    const vendorPass = await bcrypt.hash('vendor123', 10)
    const vendorUser = await prisma.user.create({ data: { email: 'vendor@college.local', name: 'Vendor User', passwordHash: vendorPass, role: 'VENDOR' } })
    const vendor = await prisma.vendor.create({ data: { name: 'Main Vendor' } })
    await prisma.user.update({ where: { id: vendorUser.id }, data: { vendorId: vendor.id } })

    const canteen = await prisma.canteen.create({
      data: {
        name: 'Central Canteen',
        location: 'Main Building',
        vendorId: vendor.id,
        menuItems: {
          create: [
            { name: 'Veg Sandwich', priceCents: 5000, imageUrl: 'https://picsum.photos/seed/sandwich/400/300' },
            { name: 'Cold Coffee', priceCents: 3000, imageUrl: 'https://picsum.photos/seed/coffee/400/300' },
            { name: 'Chicken Roll', priceCents: 7000, imageUrl: 'https://picsum.photos/seed/roll/400/300' },
          ],
        },
      },
    })

    const userPass = await bcrypt.hash('user123', 10)
    const student = await prisma.user.create({ data: { email: 'student@college.local', name: 'Student', passwordHash: userPass, role: 'USER' } })

    return NextResponse.json({
      ok: true,
      credentials: {
        admin: { email: admin.email, password: adminPassword },
        vendor: { email: vendorUser.email, password: 'vendor123' },
        user: { email: student.email, password: 'user123' },
      },
      canteen: { id: canteen.id, name: canteen.name },
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown seed error'
    console.error('Seed endpoint failed', error)
    return NextResponse.json({ error: 'Seed failed', detail }, { status: 500 })
  }
}
