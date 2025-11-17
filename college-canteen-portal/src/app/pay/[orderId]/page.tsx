import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default async function PayPage({ params }: { params: { orderId: string } }) {
  const order = await prisma.order.findUnique({ where: { id: params.orderId }, include: { payment: true } })
  if (!order) return <p>Order not found.</p>
  const amount = (order.totalCents/100).toFixed(2)
  const status = order.payment?.status ?? 'PENDING'
  const variant = status === 'PAID' ? 'success' : status === 'CANCELLED' ? 'danger' : 'info'
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-3">Payment <Badge variant={variant}>{status}</Badge></h1>
      <Card className="space-y-4">
        <div className="flex items-center justify-between text-sm"><span className="text-muted">Order</span><span className="font-medium">#{order.id.slice(0,8)}</span></div>
        <div className="flex items-center justify-between text-sm"><span className="text-muted">Amount</span><span className="font-semibold">₹{amount}</span></div>
        {status !== 'PAID' ? (
          <Link href={`/api/payment/confirm?orderId=${order.id}`} className="btn">Pay Now (Stub)</Link>
        ) : (
          <div className="text-sm text-green-500">Payment received.</div>
        )}
        {status === 'PENDING' && order.payment?.paymentLink && (
          <div className="space-y-2">
            <div className="text-xs text-muted">Having trouble? Open direct payment link:</div>
            <Link className="btn-secondary px-3 py-1.5 text-xs" href={order.payment.paymentLink}>Open Link</Link>
          </div>
        )}
      </Card>
      <div className="text-xs text-muted">Once paid, vendors are notified via WhatsApp to confirm and set prep time.</div>
    </div>
  )
}
