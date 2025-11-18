import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Input } from '@/components/ui/Input'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { revalidatePath } from 'next/cache'
import { FormSubmitButton } from '@/components/ui/FormSubmitButton'

async function AdminCanteenManager() {
  const vendors = await prisma.vendor.findMany({ select: { id: true, name: true, phone: true, whatsappEnabled: true } })
  const canteens = await prisma.canteen.findMany({ select: { id: true, name: true, location: true, notificationPhones: true } })
  const menuByCanteen = await Promise.all(
    canteens.map(async c => ({
      canteen: c,
      items: await prisma.menuItem.findMany({ where: { canteenId: c.id }, orderBy: { name: 'asc' } })
    }))
  )

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="mb-3 font-medium">Add Canteen</div>
        <form className="flex flex-col gap-2" action={async (formData: FormData) => {
          'use server'
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
            {vendors.map(v=> <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <FormSubmitButton pendingLabel="Creating...">Create</FormSubmitButton>
        </form>
      </div>

      {menuByCanteen.map(({ canteen, items }) => (
        <div key={canteen.id} className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">{canteen.name} — {canteen.location}</div>
            <form className="flex items-center gap-2" action={async (formData: FormData) => {
              'use server'
              const raw = String(formData.get('phones') || '')
              const arr = raw.split(',').map(p=>p.trim()).filter(Boolean)
              await prisma.canteen.update({ where: { id: canteen.id }, data: { notificationPhones: arr } })
              revalidatePath('/admin')
            }}>
              <input name="phones" defaultValue={canteen.notificationPhones?.join(',') ?? ''} placeholder="Notif phones (+1555..., comma sep)" className="w-64 rounded border p-2 text-xs" />
              <FormSubmitButton variant="secondary" size="sm" pendingLabel="Saving..." className="px-3 py-1 text-xs">Save Phones</FormSubmitButton>
            </form>
          </div>

          <form className="flex flex-wrap items-end gap-2" action={async (formData: FormData) => {
            'use server'
            const name = String(formData.get('name') || '')
            const priceCents = Number(formData.get('priceCents') || 0)
            const imageUrl = String(formData.get('imageUrl') || '')
            if (!name || !priceCents) return
            await prisma.menuItem.create({ data: { canteenId: canteen.id, name, priceCents, imageUrl: imageUrl || null } })
            revalidatePath('/admin')
          }}>
            <Input name="name" placeholder="Item name" className="w-48" />
            <Input name="priceCents" placeholder="Price (in cents)" className="w-48" />
            <Input name="imageUrl" placeholder="Image URL (optional)" className="w-64" />
            <FormSubmitButton pendingLabel="Adding...">Add Item</FormSubmitButton>
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
                    <TD>{it.imageUrl && <img src={it.imageUrl} alt="Item" className="h-10 w-14 rounded object-cover" />}</TD>
                    <TD>{it.name}</TD>
                    <TD>₹{(it.priceCents/100).toFixed(2)}</TD>
                    <TD>{it.available ? <Badge variant="success">Yes</Badge> : <Badge variant="warning">No</Badge>}</TD>
                    <TD>
                      <div className="flex flex-wrap items-center gap-2">
                        <form className="flex flex-wrap items-center gap-2" action={async (formData: FormData) => {
                          'use server'
                          const name = String(formData.get('name') || it.name)
                          const priceCents = Number(formData.get('priceCents') || it.priceCents)
                          const rawImage = formData.get('imageUrl')
                          const imageUrl = rawImage === null ? it.imageUrl : (String(rawImage).trim() || null)
                          const available = formData.get('available') ? true : false
                          await prisma.menuItem.update({ where: { id: it.id }, data: { name, priceCents, imageUrl, available } })
                          revalidatePath('/admin')
                        }}>
                          <Input name="name" defaultValue={it.name} className="w-40" />
                          <Input name="priceCents" defaultValue={String(it.priceCents)} className="w-36" />
                          <Input name="imageUrl" defaultValue={it.imageUrl ?? ''} className="w-64" />
                          <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="available" defaultChecked={it.available} /> Available</label>
                          <FormSubmitButton pendingLabel="Saving...">Update</FormSubmitButton>
                        </form>
                        <form action={async () => {
                          'use server'
                          await prisma.menuItem.delete({ where: { id: it.id } })
                          revalidatePath('/admin')
                        }}>
                          <FormSubmitButton
                            pendingLabel="Deleting..."
                            variant="outline"
                            className="border-red-600 text-red-600 hover:bg-red-600/10"
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
  const vendors = await prisma.vendor.findMany({ select: { id: true, name: true, phone: true, whatsappEnabled: true } })
  const stats = await prisma.order.aggregate({ _sum: { totalCents: true, commissionCents: true, vendorTakeCents: true }, _count: true })
  const orders = await prisma.order.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { canteen: true, user: true } })
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-3 font-medium">Vendor Settings</div>
        <div className="space-y-3">
          {vendors.map(v => (
            <form key={v.id} className="flex flex-wrap items-end gap-2" action={async (formData: FormData) => {
              'use server'
              const phone = String(formData.get('phone') || '')
              const whatsappEnabled = formData.get('whatsappEnabled') ? true : false
              await prisma.vendor.update({ where: { id: v.id }, data: { phone: phone || null, whatsappEnabled } })
              revalidatePath('/admin')
            }}>
              <div className="w-40 text-sm font-medium">{v.name}</div>
              <Input name="phone" defaultValue={v.phone ?? ''} placeholder="WhatsApp phone (e.g. +9198...)" className="w-72" />
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="whatsappEnabled" defaultChecked={v.whatsappEnabled} /> Enable WhatsApp</label>
              <FormSubmitButton pendingLabel="Saving...">Save</FormSubmitButton>
            </form>
          ))}
        </div>
      </div>
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card"><div className="text-sm text-gray-600">Total Sales</div><div className="text-2xl font-semibold">₹{((stats._sum.totalCents ?? 0)/100).toFixed(2)}</div></div>
        <div className="card"><div className="text-sm text-gray-600">Commission (2.5%)</div><div className="text-2xl font-semibold">₹{((stats._sum.commissionCents ?? 0)/100).toFixed(2)}</div></div>
        <div className="card"><div className="text-sm text-gray-600">Orders</div><div className="text-2xl font-semibold">{stats._count}</div></div>
      </div>
      <div className="card">
        <div className="mb-2 font-medium">Recent Orders</div>
        <ul className="list-disc pl-5 text-sm">
          {orders.map(o => (
            <li key={o.id}>
              {o.id.slice(0,8)} — {o.canteen.name} — {o.user.email} — ₹{(o.totalCents/100).toFixed(2)} — {o.status}
              {typeof o.prepMinutes === 'number' ? ` — Prep: ${o.prepMinutes} min` : ''}
            </li>
          ))}
        </ul>
      </div>
      <AdminCanteenManager />
    </div>
  )
}
