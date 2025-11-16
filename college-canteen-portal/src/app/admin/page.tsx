import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

async function AdminCanteenManager() {
  const vendors = await prisma.vendor.findMany({ select: { id: true, name: true, phone: true, whatsappEnabled: true } })
  const canteens = await prisma.canteen.findMany({ select: { id: true, name: true, location: true } })
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
        }}>
          <input name="name" placeholder="Name" className="rounded border p-2" />
          <input name="location" placeholder="Location" className="rounded border p-2" />
          <select name="vendorId" className="rounded border p-2">
            <option value="">Select Vendor</option>
            {vendors.map(v=> <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button className="btn w-fit" type="submit">Create</button>
        </form>
      </div>

      {menuByCanteen.map(({ canteen, items }) => (
        <div key={canteen.id} className="card space-y-3">
          <div className="font-medium">{canteen.name} — {canteen.location}</div>

          <form className="flex flex-wrap items-end gap-2" action={async (formData: FormData) => {
            'use server'
            const name = String(formData.get('name') || '')
            const priceCents = Number(formData.get('priceCents') || 0)
            const imageUrl = String(formData.get('imageUrl') || '')
            if (!name || !priceCents) return
            await prisma.menuItem.create({ data: { canteenId: canteen.id, name, priceCents, imageUrl: imageUrl || null } })
          }}>
            <input name="name" placeholder="Item name" className="w-48 rounded border p-2" />
            <input name="priceCents" placeholder="Price (in cents)" className="w-48 rounded border p-2" />
            <input name="imageUrl" placeholder="Image URL (optional)" className="w-64 rounded border p-2" />
            <button className="btn" type="submit">Add Item</button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-600">
                  <th className="p-2">Image</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Price</th>
                  <th className="p-2">Available</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2">{it.imageUrl && <img src={it.imageUrl} className="h-10 w-14 rounded object-cover" />}</td>
                    <td className="p-2">{it.name}</td>
                    <td className="p-2">₹{(it.priceCents/100).toFixed(2)}</td>
                    <td className="p-2">{it.available ? 'Yes' : 'No'}</td>
                    <td className="p-2">
                      <form className="flex flex-wrap items-center gap-2" action={async (formData: FormData) => {
                        'use server'
                        const name = String(formData.get('name') || it.name)
                        const priceCents = Number(formData.get('priceCents') || it.priceCents)
                        const imageUrl = String(formData.get('imageUrl') || it.imageUrl || '')
                        const available = formData.get('available') ? true : false
                        await prisma.menuItem.update({ where: { id: it.id }, data: { name, priceCents, imageUrl: imageUrl || null, available } })
                      }}>
                        <input name="name" defaultValue={it.name} className="w-40 rounded border p-2" />
                        <input name="priceCents" defaultValue={it.priceCents} className="w-36 rounded border p-2" />
                        <input name="imageUrl" defaultValue={it.imageUrl ?? ''} className="w-64 rounded border p-2" />
                        <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="available" defaultChecked={it.available} /> Available</label>
                        <button className="btn" type="submit">Update</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            }}>
              <div className="w-40 text-sm font-medium">{v.name}</div>
              <input name="phone" defaultValue={v.phone ?? ''} placeholder="WhatsApp phone (e.g. 9198...)" className="w-72 rounded border p-2" />
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="whatsappEnabled" defaultChecked={v.whatsappEnabled} /> Enable WhatsApp</label>
              <button className="btn" type="submit">Save</button>
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
            <li key={o.id}>{o.id.slice(0,8)} — {o.canteen.name} — {o.user.email} — ₹{(o.totalCents/100).toFixed(2)} — {o.status}</li>
          ))}
        </ul>
      </div>
      <AdminCanteenManager />
    </div>
  )
}
