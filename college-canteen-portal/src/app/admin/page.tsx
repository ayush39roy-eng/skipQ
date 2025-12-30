import { prisma } from '@/lib/prisma'
import { VendorMode } from '@/lib/vendor-mode'
import { requireRole } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminPage() {
  const session = await requireRole(['ADMIN'])
  if (!session) return <p>Unauthorized</p>

  const [vendors, vendorUsers, stats, recentOrders, canteens, allOrders] = await Promise.all([
    // @ts-ignore
    prisma.vendor.findMany({ select: { id: true, name: true, phone: true, whatsappEnabled: true, mode: true } }),
    prisma.user.findMany({
      where: { role: 'VENDOR' },
      select: { id: true, name: true, email: true, vendor: { select: { id: true, name: true } } }
    }),
    prisma.order.aggregate({
      where: { status: { notIn: ['PENDING', 'CANCELLED'] } },
      _sum: { totalCents: true, commissionCents: true, vendorTakeCents: true },
      _count: true
    }),
    prisma.order.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { canteen: true, user: true } }),
    prisma.canteen.findMany({ select: { id: true, name: true, location: true, imageUrl: true } }),
    // Fetch all completed orders for charts and top canteens calculation
    prisma.order.findMany({
      where: { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] } },
      select: { id: true, totalCents: true, canteenId: true, createdAt: true }
    })
  ])

  // Calculate Top Canteens
  const canteenStats = new Map<string, { revenue: number; orders: number }>()
  allOrders.forEach(o => {
    const current = canteenStats.get(o.canteenId) || { revenue: 0, orders: 0 }
    canteenStats.set(o.canteenId, {
      revenue: current.revenue + o.totalCents,
      orders: current.orders + 1
    })
  })

  const topCanteens = canteens
    .map(c => ({
      ...c,
      stats: canteenStats.get(c.id) || { revenue: 0, orders: 0 }
    }))
    .sort((a, b) => b.stats.revenue - a.stats.revenue)
    .slice(0, 5)

  // Server Actions
  async function createVendor(formData: FormData) {
    'use server'
    const session = await requireRole(['ADMIN'])
    if (!session) return
    const name = String(formData.get('vendorName') || '').trim()
    if (!name) return
    const phone = String(formData.get('vendorPhone') || '').trim()
    const whatsappEnabled = Boolean(formData.get('vendorWhatsApp'))
    await prisma.vendor.create({ data: { name, phone: phone || null, whatsappEnabled } })
    revalidatePath('/admin')
  }

  async function updateVendor(formData: FormData) {
    'use server'
    const session = await requireRole(['ADMIN'])
    if (!session) return
    const id = String(formData.get('id'))
    const phone = String(formData.get('phone') || '')
    const whatsappEnabled = formData.get('whatsappEnabled') ? true : false
    await prisma.vendor.update({ where: { id }, data: { phone: phone || null, whatsappEnabled } })
    revalidatePath('/admin')
  }

  async function updateVendorCredentials(formData: FormData) {
    'use server'
    const session = await requireRole(['ADMIN'])
    if (!session) return
    const vendorId = String(formData.get('vendorAccountVendorId') || '')
    const name = String(formData.get('vendorAccountName') || '').trim()
    const email = String(formData.get('vendorAccountEmail') || '').trim().toLowerCase()
    const password = String(formData.get('vendorAccountPassword') || '')
    if (!vendorId || !name || !email || !password) return
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.role !== 'VENDOR') return
    const passwordHash = await bcrypt.hash(password, 10)
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash, vendorId, role: 'VENDOR' } })
    } else {
      await prisma.user.create({ data: { name, email, passwordHash, role: 'VENDOR', vendorId } })
    }
    revalidatePath('/admin')
  }

  async function createCanteen(formData: FormData) {
    'use server'
    const session = await requireRole(['ADMIN'])
    if (!session) return
    const name = String(formData.get('name') || '')
    const location = String(formData.get('location') || '')
    const vendorId = String(formData.get('vendorId') || '')
    if (!name || !location || !vendorId) return
    await prisma.canteen.create({ data: { name, location, vendorId } })
    revalidatePath('/admin')
  }

  async function updateVendorMode(formData: FormData) {
    'use server'
    const session = await requireRole(['ADMIN'])
    if (!session) return
    const vendorId = String(formData.get('vendorId'))
    const mode = String(formData.get('mode')) as VendorMode
    
    if (!vendorId || !mode) return
    
    // Get old mode for logging
    // @ts-ignore
    // @ts-ignore
    const vendor = (await prisma.vendor.findUnique({ where: { id: vendorId }, select: { mode: true } })) as any
    if (!vendor) return

    if (vendor.mode === mode) return

    await prisma.$transaction([
        // @ts-ignore
        prisma.vendor.update({
            where: { id: vendorId },
            data: { mode }
        }),
        // @ts-ignore
        prisma.adminActionLog.create({
            data: {
                adminId: session.user.id,
                vendorId: vendorId,
                actionType: 'VENDOR_MODE_CHANGE',
                oldMode: vendor.mode,
                newMode: mode
            }
        })
    ])

    revalidatePath('/admin')
    revalidatePath('/vendor')
    revalidatePath('/vendor/terminal')
    console.log(`[ADMIN] Updated Vendor ${vendorId} to mode ${mode}`)
  }

  async function deleteVendor(formData: FormData) {
    'use server'
    const session = await requireRole(['ADMIN'])
    if (!session) return
    const vendorId = String(formData.get('vendorId'))
    if (!vendorId) return

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Delete Linked Users
            await tx.user.deleteMany({ where: { vendorId } })
            
            // 2. Delete Inventory & Staff
            await tx.inventoryItem.deleteMany({ where: { vendorId } })
            await tx.staff.deleteMany({ where: { vendorId } })
            // @ts-ignore
            await tx.ledgerEntry.deleteMany({ where: { vendorId } })
            
            // 3. Delete Canteens (and Cascade)
            const canteens = await tx.canteen.findMany({ where: { vendorId } })
            for (const c of canteens) {
                await tx.menuItem.deleteMany({ where: { canteenId: c.id } })
                await tx.menuSection.deleteMany({ where: { canteenId: c.id } })
                await tx.shift.deleteMany({ where: { canteenId: c.id } })
                // Orders? If we want full cleanup.
                await tx.order.deleteMany({ where: { canteenId: c.id } })
            }
            await tx.canteen.deleteMany({ where: { vendorId } })

            // 4. Delete Vendor
            await tx.vendor.delete({ where: { id: vendorId } })
        })
        revalidatePath('/admin')
    } catch (error) {
        console.error('Delete Vendor Error:', error)
    }
  }

  return (
    <AdminDashboardClient
      stats={{
        totalSales: stats._sum.totalCents ?? 0,
        commission: stats._sum.commissionCents ?? 0,
        totalOrders: stats._count
      }}
      activeCanteensCount={canteens.length}
      orders={allOrders.map(o => ({
        id: o.id,
        totalCents: o.totalCents,
        createdAt: o.createdAt.toISOString()
      }))}
      recentOrders={recentOrders}
      topCanteens={topCanteens}
      vendors={vendors}
      vendorUsers={vendorUsers}
      canteens={canteens}
      actions={{
        createVendor,
        updateVendor,
        updateVendorCredentials,
        createCanteen,
        updateVendorMode,
        deleteVendor
      }}
    />
  )
}
