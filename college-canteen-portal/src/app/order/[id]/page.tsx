import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function OrderPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { items: { include: { menuItem: true } }, payment: true, canteen: true } })
  if (!order) return <p>Order not found.</p>
  const total = (order.totalCents/100).toFixed(2)
  const status = order.status
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Order #{order.id.slice(0,8)}</h1>
      <div className="card">
        <div className="mb-2 text-sm text-gray-600">Canteen: {order.canteen.name}</div>
        <ul className="mb-2 list-disc pl-5">
          {order.items.map(it=> (
            <li key={it.id}>{it.menuItem.name} x {it.quantity} — ₹{(it.priceCents*it.quantity/100).toFixed(2)}</li>
          ))}
        </ul>
        <div className="mb-2">Total: ₹{total}</div>
        <div className="mb-2">Status: <span className="font-medium">{status}</span></div>
        {order.prepMinutes != null && <div className="mb-2">Prep time: {order.prepMinutes} min</div>}
        {!order.payment || order.payment.status !== 'PAID' ? (
          <Link className="btn" href={`/api/payment/create-link?orderId=${order.id}`}>Pay Now</Link>
        ) : (
          <div className="text-green-700">Payment received.</div>
        )}
      </div>
      {order.payment && order.payment.status === 'PENDING' && (
        <div className="card">
          <div className="mb-2">Payment link:</div>
          <Link className="btn" href={order.payment.paymentLink}>Open Payment Page</Link>
        </div>
      )}
    </div>
  )
}
