import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import OrderStatusClient from '../_components/status-client'
import PayNowButton from '../_components/pay-now-button'

export default async function OrderPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { items: { include: { menuItem: true } }, payment: true, canteen: true } })
  if (!order) return <p>Order not found.</p>
  const total = (order.totalCents/100).toFixed(2)
  const status = order.status
  const statusVariant = status === 'PAID' || status === 'CONFIRMED' ? 'success' : status === 'CANCELLED' ? 'danger' : 'info'
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-3">Order #{order.id.slice(0,8)} <Badge variant={statusVariant}>{status}</Badge></h1>
      <Card className="space-y-3">
        <div className="text-sm text-muted">Canteen: {order.canteen.name}</div>
        <ul className="divide-y divide-[rgb(var(--border))] rounded-md border border-[rgb(var(--border))]">
          {order.items.map(it=> (
            <li key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{it.menuItem.name} × {it.quantity}</span>
              <span className="font-medium">₹{(it.priceCents*it.quantity/100).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between text-sm"><span className="text-muted">Total</span><span className="font-semibold">₹{total}</span></div>
        <OrderStatusClient orderId={order.id} initialStatus={order.status} initialPrep={order.prepMinutes} initialPaymentStatus={order.payment?.status ?? null} />
        {!order.payment || order.payment.status !== 'PAID' ? (
          <PayNowButton orderId={order.id} />
        ) : (
          <div className="text-sm text-green-500">Payment received.</div>
        )}
      </Card>
      {order.payment && order.payment.status === 'PENDING' && (
        <Card className="space-y-2">
          <div className="text-sm font-medium">Payment link</div>
          <Link className="btn" href={order.payment.paymentLink}>Open Payment Page</Link>
        </Card>
      )}
    </div>
  )
}
