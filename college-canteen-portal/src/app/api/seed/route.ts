import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Dynamic to access env + perform writes at request time
export const dynamic = 'force-dynamic'

// GET /api/seed?token=YOUR_TOKEN
// Only runs if no ADMIN user exists yet. Use once, then delete this file.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = (url.searchParams.get('token') || '').trim()
  const expected = (process.env.SEED_TOKEN || '').trim()
  if (!expected) return NextResponse.json({ error: 'SEED_TOKEN not set on server' }, { status: 500 })
  if (token !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (existingAdmin) {
    return NextResponse.json({ error: 'Already seeded', admin: existingAdmin.email }, { status: 409 })
  }
  try {
    const adminPass = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.create({ data: { email: 'admin@college.local', name: 'Admin', passwordHash: adminPass, role: 'ADMIN' } })

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
        admin: { email: admin.email, password: 'admin123' },
        vendor: { email: vendorUser.email, password: 'vendor123' },
        user: { email: student.email, password: 'user123' },
      },
      canteen: { id: canteen.id, name: canteen.name },
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Seed failed', detail: e.message }, { status: 500 })
  }
}
