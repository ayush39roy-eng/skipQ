import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Input } from '@/components/ui/Input'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { revalidatePath } from 'next/cache'
import Image from 'next/image'
import { FormSubmitButton } from '@/components/ui/FormSubmitButton'
import bcrypt from 'bcryptjs'

async function AdminCanteenManager() {
  const [vendors, canteens] = await Promise.all([
    prisma.vendor.findMany({ select: { id: true, name: true, phone: true, whatsappEnabled: true } }),
    prisma.canteen.findMany({
      select: {
        id: true, name: true, location: true, notificationPhones: true,
        menuItems: { orderBy: { name: 'asc' } }
      }
    })
  ])

  const menuByCanteen = canteens.map(c => ({ canteen: c, items: c.menuItems }))

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="mb-3 font-medium">Add Canteen</div>
        <form className="flex flex-col gap-2" action={async (formData: FormData) => {
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
          <Input name="name" placeholder="Name" required />
          <Input name="location" placeholder="Location" required />
          <select name="vendorId" className="rounded border p-2" required>
            <option value="">Select Vendor</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <FormSubmitButton pendingLabel="Creating...">Create</FormSubmitButton>
        </form>
      </div>

      {menuByCanteen.map(({ canteen, items }) => (
        <div key={canteen.id} className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">{canteen.name} — {canteen.location}</div>
            <form className="flex flex-col gap-2 sm:flex-row sm:items-center" action={async (formData: FormData) => {
              'use server'
              const session = await requireRole(['ADMIN'])
              if (!session) return
              const raw = String(formData.get('phones') || '')
              const arr = raw.split(',').map(p => p.trim()).filter(Boolean)
              await prisma.canteen.update({ where: { id: canteen.id }, data: { notificationPhones: arr } })
              revalidatePath('/admin')
            }}>
              <input name="phones" defaultValue={canteen.notificationPhones?.join(',') ?? ''} placeholder="Notif phones (+1555..., comma sep)" className="w-full rounded border p-2 text-xs sm:w-64" />
              <FormSubmitButton variant="secondary" size="sm" pendingLabel="Saving..." className="px-3 py-1 text-xs sm:self-end">Save Phones</FormSubmitButton>
            </form>
          </div>

          <div className="flex flex-col gap-2 border border-dashed border-[rgb(var(--border))] p-3 text-sm sm:flex-row sm:items-end">
            <form className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end" action={async (formData: FormData) => {
              'use server'
              const session = await requireRole(['ADMIN'])
              if (!session) return
              const name = String(formData.get('name') || '').trim()
              const location = String(formData.get('location') || '').trim()
              if (!name || !location) return
              await prisma.canteen.update({ where: { id: canteen.id }, data: { name, location } })
              revalidatePath('/admin')
            }}>
              <Input name="name" label="Name" defaultValue={canteen.name} className="w-full sm:w-48" required />
              <Input name="location" label="Location" defaultValue={canteen.location} className="w-full sm:w-48" required />
              <FormSubmitButton pendingLabel="Saving..." className="w-full sm:w-auto">Rename / Move</FormSubmitButton>
            </form>
            <form
              className="sm:w-auto"
              action={async () => {
                'use server'
                const session = await requireRole(['ADMIN'])
                if (!session) return
                await prisma.$transaction(async tx => {
                  const orders = await tx.order.findMany({ where: { canteenId: canteen.id }, select: { id: true } })
                  const orderIds = orders.map(o => o.id)
                  if (orderIds.length) {
                    await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } })
                    await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
                  }
                  await tx.menuItem.deleteMany({ where: { canteenId: canteen.id } })
                  if (orderIds.length) {
                    await tx.order.deleteMany({ where: { id: { in: orderIds } } })
                  }
                  await tx.canteen.delete({ where: { id: canteen.id } })
                })
                revalidatePath('/admin')
              }}
            >
              <FormSubmitButton
                variant="outline"
                className="w-full border-red-600 text-red-600 hover:bg-red-600/10 sm:w-auto"
                pendingLabel="Deleting..."
              >
                Delete Canteen
              </FormSubmitButton>
            </form>
          </div>

          <form className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end" action={async (formData: FormData) => {
            'use server'
            const session = await requireRole(['ADMIN'])
            if (!session) return
            const name = String(formData.get('name') || '')
            const priceCents = Number(formData.get('priceCents') || 0)
            const imageUrl = String(formData.get('imageUrl') || '')
            if (!name || !priceCents) return
            await prisma.menuItem.create({ data: { canteenId: canteen.id, name, priceCents, imageUrl: imageUrl || null } })
            revalidatePath('/admin')
          }}>
            <Input name="name" placeholder="Item name" className="w-full sm:w-48" />
            <Input name="priceCents" placeholder="Price (in cents)" className="w-full sm:w-48" />
            <Input name="imageUrl" placeholder="Image URL (optional)" className="w-full sm:w-64" />
            <FormSubmitButton pendingLabel="Adding..." className="w-full sm:w-auto">Add Item</FormSubmitButton>
          </form>

          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Image</TH>
                  <TH>Name</TH>
                  <TH>Price</TH>
                  <TH>Available</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map(it => (
                  <TR key={it.id}>
                    <TD>{it.imageUrl && (
                      <Image
                        src={it.imageUrl}
                        alt={`${it.name} image`}
                        width={56}
                        height={40}
                        unoptimized
                        className="h-10 w-14 rounded object-cover"
                      />
                    )}</TD>
                    <TD>{it.name}</TD>
                    <TD>₹{(it.priceCents / 100).toFixed(2)}</TD>
                    <TD>{it.available ? <Badge variant="success">Yes</Badge> : <Badge variant="warning">No</Badge>}</TD>
                    <TD>
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <form className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" action={async (formData: FormData) => {
                          'use server'
                          const session = await requireRole(['ADMIN'])
                          if (!session) return
                          const name = String(formData.get('name') || it.name)
                          const priceCents = Number(formData.get('priceCents') || it.priceCents)
                          const rawImage = formData.get('imageUrl')
                          const imageUrl = rawImage === null ? it.imageUrl : (String(rawImage).trim() || null)
                          const available = formData.get('available') ? true : false
                          await prisma.menuItem.update({ where: { id: it.id }, data: { name, priceCents, imageUrl, available } })
                          revalidatePath('/admin')
                        }}>
                          <Input name="name" defaultValue={it.name} className="w-full sm:w-40" />
                          <Input name="priceCents" defaultValue={String(it.priceCents)} className="w-full sm:w-36" />
                          <Input name="imageUrl" defaultValue={it.imageUrl ?? ''} className="w-full sm:w-64" />
                          <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="available" defaultChecked={it.available} /> Available</label>
                          <FormSubmitButton pendingLabel="Saving..." className="w-full sm:w-auto">Update</FormSubmitButton>
                        </form>
                        <form className="sm:w-auto" action={async () => {
                          'use server'
                          const session = await requireRole(['ADMIN'])
                          if (!session) return
                          await prisma.menuItem.delete({ where: { id: it.id } })
                          revalidatePath('/admin')
                        }}>
                          <FormSubmitButton
                            pendingLabel="Deleting..."
                            variant="outline"
                            className="w-full border-red-600 text-red-600 hover:bg-red-600/10 sm:w-auto"
                          >
                            Delete
                          </FormSubmitButton>
                        </form>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function AdminPage() {
  const session = await requireRole(['ADMIN'])
  if (!session) return <p>Unauthorized</p>

  const [vendors, vendorUsers, stats, orders] = await Promise.all([
    prisma.vendor.findMany({ select: { id: true, name: true, phone: true, whatsappEnabled: true } }),
    prisma.user.findMany({
      where: { role: 'VENDOR' },
      select: { id: true, name: true, email: true, vendor: { select: { id: true, name: true } } }
    }),
    prisma.order.aggregate({ _sum: { totalCents: true, commissionCents: true, vendorTakeCents: true }, _count: true }),
    prisma.order.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { canteen: true, user: true } })
  ])
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3">
          <div className="font-medium">Add Vendor</div>
          <form
            className="space-y-3"
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
            <Input name="vendorName" label="Vendor name" placeholder="Cafe XYZ" required />
            <Input name="vendorPhone" label="WhatsApp phone" placeholder="+9198..." />
            <label className="flex items-center gap-2 text-sm text-[rgb(var(--text))]">
              <input type="checkbox" name="vendorWhatsApp" defaultChecked />
              Enable WhatsApp alerts
            </label>
            <FormSubmitButton pendingLabel="Creating...">Create Vendor</FormSubmitButton>
          </form>
        </div>

        <div className="card space-y-3">
          <div className="font-medium">Create Vendor Login</div>
          <form
            className="space-y-3"
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
            <label className="block space-y-1">
              <span className="text-sm font-medium" style={{ color: 'rgb(var(--text))' }}>Vendor</span>
              <select name="vendorAccountVendorId" className="input" required defaultValue="">
                <option value="" disabled>Select vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </label>
            <Input name="vendorAccountName" label="Contact name" placeholder="Vendor lead" required />
            <Input name="vendorAccountEmail" label="Login email" type="email" placeholder="vendor@college.local" required />
            <Input name="vendorAccountPassword" label="Password" type="password" placeholder="Set temporary password" required />
            <FormSubmitButton pendingLabel="Saving...">Create / Update Login</FormSubmitButton>
          </form>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/40 p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Existing vendor logins</p>
            <div className="mt-2 space-y-1">
              {vendorUsers.length === 0 && <p className="text-[rgb(var(--text-muted))]">No vendor logins yet.</p>}
              {vendorUsers.map((user) => (
                <div key={user.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{user.name} — {user.email}</span>
                  <span className="text-xs text-[rgb(var(--text-muted))]">{user.vendor?.name ?? 'Unlinked'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 font-medium">Vendor Settings</div>
        <div className="space-y-3">
          {vendors.map(v => (
            <form key={v.id} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end" action={async (formData: FormData) => {
              'use server'
              const session = await requireRole(['ADMIN'])
              if (!session) return
              const phone = String(formData.get('phone') || '')
              const whatsappEnabled = formData.get('whatsappEnabled') ? true : false
              await prisma.vendor.update({ where: { id: v.id }, data: { phone: phone || null, whatsappEnabled } })
              revalidatePath('/admin')
            }}>
              <div className="text-sm font-medium sm:w-40">{v.name}</div>
              <Input name="phone" defaultValue={v.phone ?? ''} placeholder="WhatsApp phone (e.g. +9198...)" className="w-full sm:w-72" />
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="whatsappEnabled" defaultChecked={v.whatsappEnabled} /> Enable WhatsApp</label>
              <FormSubmitButton pendingLabel="Saving..." className="w-full sm:w-auto">Save</FormSubmitButton>
            </form>
          ))}
        </div>
      </div>
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card"><div className="text-sm text-gray-600">Total Sales</div><div className="text-2xl font-semibold">₹{((stats._sum.totalCents ?? 0) / 100).toFixed(2)}</div></div>
        <div className="card"><div className="text-sm text-gray-600">Commission (2.5%)</div><div className="text-2xl font-semibold">₹{((stats._sum.commissionCents ?? 0) / 100).toFixed(2)}</div></div>
        <div className="card"><div className="text-sm text-gray-600">Orders</div><div className="text-2xl font-semibold">{stats._count}</div></div>
      </div>
      <div className="card">
        <div className="mb-2 font-medium">Recent Orders</div>
        <ul className="list-disc pl-5 text-sm">
          {orders.map(o => (
            <li key={o.id}>
              {o.id.slice(0, 8)} — {o.canteen.name} — {o.user.email} — ₹{(o.totalCents / 100).toFixed(2)} — {o.status}
              {typeof o.prepMinutes === 'number' ? ` — Prep: ${o.prepMinutes} min` : ''}
            </li>
          ))}
        </ul>
      </div>
      <AdminCanteenManager />
    </div>
  )
}
