import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { revalidatePath } from 'next/cache'
import Image from 'next/image'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormSubmitButton } from '@/components/ui/FormSubmitButton'
import bcrypt from 'bcryptjs'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default async function AdminPage() {
  const session = await requireRole(['ADMIN'])
  if (!session) return <p>Unauthorized</p>

  const [vendors, vendorUsers, stats, orders, canteens] = await Promise.all([
    prisma.vendor.findMany({ select: { id: true, name: true, phone: true, whatsappEnabled: true } }),
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
    prisma.canteen.findMany({ select: { id: true, name: true, location: true, imageUrl: true } })
  ])

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-[rgb(var(--text-muted))]">Manage canteens, vendors, and view platform performance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm font-medium text-[rgb(var(--text-muted))]">Total Sales</div>
          <div className="mt-2 text-3xl font-bold">₹{((stats._sum.totalCents ?? 0) / 100).toFixed(2)}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-[rgb(var(--text-muted))]">Commission (5%)</div>
          <div className="mt-2 text-3xl font-bold">₹{((stats._sum.commissionCents ?? 0) / 100).toFixed(2)}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-[rgb(var(--text-muted))]">Total Orders</div>
          <div className="mt-2 text-3xl font-bold">{stats._count}</div>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Vendor Management Column */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Add New Vendor</h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">Register a new food vendor partner.</p>
            </div>
            <form
              className="space-y-4"
              action={async (formData: FormData) => {
                'use server'
                const session = await requireRole(['ADMIN'])
                if (!session) return
                const name = String(formData.get('vendorName') || '').trim()
                if (!name) return
                const phone = String(formData.get('vendorPhone') || '').trim()
                const whatsappEnabled = Boolean(formData.get('vendorWhatsApp'))
                await prisma.vendor.create({ data: { name, phone: phone || null, whatsappEnabled } })
                revalidatePath('/admin')
              }}
            >
              <div className="grid gap-4">
                <Input name="vendorName" label="Vendor Name" placeholder="e.g. Spice Garden" required />
                <Input name="vendorPhone" label="WhatsApp Number" placeholder="+91..." />
              </div>
              <label className="flex items-center gap-2 text-sm text-[rgb(var(--text))] cursor-pointer">
                <input type="checkbox" name="vendorWhatsApp" defaultChecked className="rounded border-gray-300" />
                Enable WhatsApp alerts for this vendor
              </label>
              <FormSubmitButton pendingLabel="Creating..." className="w-full">Create Vendor</FormSubmitButton>
            </form>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Vendor Login Access</h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">Create or update login credentials for vendor staff.</p>
            </div>
            <form
              className="space-y-4"
              action={async (formData: FormData) => {
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
              }}
            >
              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Select Vendor</span>
                  <select name="vendorAccountVendorId" className="input w-full bg-[rgb(var(--surface))]" required defaultValue="">
                    <option value="" disabled>Choose a vendor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                </label>
                <Input name="vendorAccountName" label="Staff Name" placeholder="e.g. John Doe" required />
                <Input name="vendorAccountEmail" label="Email Address" type="email" placeholder="staff@vendor.com" required />
                <Input name="vendorAccountPassword" label="Set Password" type="password" placeholder="••••••••" required />
              </div>
              <FormSubmitButton pendingLabel="Saving..." className="w-full">Update Credentials</FormSubmitButton>
            </form>

            <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/30 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-3">Active Logins</h3>
              <div className="space-y-2">
                {vendorUsers.length === 0 && <p className="text-sm text-[rgb(var(--text-muted))]">No vendor accounts created yet.</p>}
                {vendorUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-[rgb(var(--text-muted))] text-xs">{user.email}</span>
                    </div>
                    <Badge variant="default">{user.vendor?.name ?? 'Unlinked'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Orders & Settings Column */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Recent Orders</h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">Latest 10 transactions across all canteens.</p>
            </div>
            <div className="space-y-3">
              {orders.map(o => {
                const instr = (o as unknown as { cookingInstructions?: string }).cookingInstructions as string | undefined
                return (
                  <div key={o.id} className="flex items-start justify-between border-b border-[rgb(var(--border))] pb-3 last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[rgb(var(--text-muted))]">#{o.id.slice(0, 8)}</span>
                        <span className="text-sm font-medium">{o.canteen.name}</span>
                      </div>
                      <div className="text-xs text-[rgb(var(--text-muted))] mt-0.5">{o.user.email}</div>
                      {instr?.trim() && <div className="text-xs text-amber-500 mt-1">Note: {instr.slice(0, 40)}{instr.length > 40 ? '…' : ''}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">₹{(o.totalCents / 100).toFixed(2)}</div>
                      <Badge variant={o.status === 'PAID' || o.status === 'CONFIRMED' ? 'success' : 'default'} className="mt-1 text-[10px] px-1.5 py-0.5 h-auto">
                        {o.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Vendor Configuration</h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">Manage contact details and alert settings.</p>
            </div>
            <div className="divide-y divide-[rgb(var(--border))]">
              {vendors.map(v => (
                <form key={v.id} className="py-4 first:pt-0 last:pb-0" action={async (formData: FormData) => {
                  'use server'
                  const session = await requireRole(['ADMIN'])
                  if (!session) return
                  const phone = String(formData.get('phone') || '')
                  const whatsappEnabled = formData.get('whatsappEnabled') ? true : false
                  await prisma.vendor.update({ where: { id: v.id }, data: { phone: phone || null, whatsappEnabled } })
                  revalidatePath('/admin')
                }}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{v.name}</span>
                      <FormSubmitButton size="sm" variant="secondary" pendingLabel="Saving...">Save</FormSubmitButton>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input name="phone" defaultValue={v.phone ?? ''} placeholder="WhatsApp (+91...)" className="text-sm" />
                      <label className="flex items-center gap-2 text-sm cursor-pointer border rounded px-3 py-2">
                        <input type="checkbox" name="whatsappEnabled" defaultChecked={v.whatsappEnabled} />
                        <span>WhatsApp Alerts</span>
                      </label>
                    </div>
                  </div>
                </form>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="pt-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Canteens</h2>
            <p className="text-[rgb(var(--text-muted))]">Manage dining locations and menus.</p>
          </div>
        </div>

        {/* Add Canteen Card */}
        <Card className="p-6 border-dashed border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/10">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Add New Canteen</h3>
            <p className="text-sm text-[rgb(var(--text-muted))]">Create a new dining location.</p>
          </div>
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end" action={async (formData: FormData) => {
            'use server'
            const session = await requireRole(['ADMIN'])
            if (!session) return
            const name = String(formData.get('name') || '')
            const location = String(formData.get('location') || '')
            const vendorId = String(formData.get('vendorId') || '')
            if (!name || !location || !vendorId) return
            await prisma.canteen.create({ data: { name, location, vendorId } })
            revalidatePath('/admin')
          }}>
            <Input name="name" placeholder="Canteen Name" className="flex-1" required />
            <Input name="location" placeholder="Location (e.g. Block A)" className="flex-1" required />
            <select name="vendorId" className="input flex-1" required>
              <option value="">Select Vendor Owner</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <FormSubmitButton pendingLabel="Creating...">Create Canteen</FormSubmitButton>
          </form>
        </Card>

        {/* Canteens List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {canteens.map((canteen) => (
            <Card key={canteen.id} className="overflow-hidden border-[rgb(var(--border))] shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6 flex items-start gap-4">
                {canteen.imageUrl ? (
                  <Image
                    src={canteen.imageUrl}
                    alt={canteen.name}
                    width={80}
                    height={80}
                    unoptimized
                    className="h-20 w-20 rounded-lg object-cover shadow-sm bg-white"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-[rgb(var(--surface-muted))] flex items-center justify-center text-[rgb(var(--text-muted))] text-xs">
                    No Image
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{canteen.name}</h3>
                  <p className="text-sm text-[rgb(var(--text-muted))] mb-4">📍 {canteen.location}</p>
                  <Link href={`/admin/canteen/${canteen.id}`}>
                    <FormSubmitButton size="sm" className="w-full sm:w-auto">
                      Manage Canteen →
                    </FormSubmitButton>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
