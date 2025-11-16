import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function PayPage({ params }: { params: { orderId: string } }) {
  const order = await prisma.order.findUnique({ where: { id: params.orderId } })
  if (!order) return <p>Order not found.</p>
  const amount = (order.totalCents/100).toFixed(2)
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Payment</h1>
      <div className="card space-y-2">
        <div>Order: {order.id.slice(0,8)}</div>
        <div>Amount: ₹{amount}</div>
        <Link className="btn" href={`/api/payment/confirm?orderId=${order.id}`}>Pay Now (Stub)</Link>
      </div>
    </div>
  )
}
