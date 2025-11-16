import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

export default async function VendorPage() {
  const session = await requireRole(['VENDOR'])
  if (!session) return <p>Unauthorized</p>
  const orders = await prisma.order.findMany({ where: { vendorId: session.user.vendorId ?? undefined }, include: { canteen: true }, orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Vendor Orders</h1>
      {orders.map(o => (
        <form key={o.id} className="card space-y-2" action={`/api/vendor/orders`} method="POST">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Order {o.id.slice(0,8)} — {o.canteen.name}</div>
              <div className="text-sm text-gray-600">Status: {o.status} | Total ₹{(o.totalCents/100).toFixed(2)}</div>
            </div>
            <input type="hidden" name="orderId" value={o.id} />
          </div>
          <div className="flex gap-2">
            <button className="btn" name="action" value="CONFIRM">Confirm</button>
            <button className="btn" name="action" value="CANCELLED">Cancel</button>
            <input className="w-24 rounded border p-2" placeholder="Prep (min)" name="prepMinutes" />
            <button className="btn" name="action" value="SET_PREP">Set Prep Time</button>
          </div>
        </form>
      ))}
    </div>
  )
}
