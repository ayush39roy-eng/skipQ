import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RazorpayCheckout } from '@/components/RazorpayCheckout'

export default async function PayPage({ params }: { params: { orderId: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { payment: true, user: true }
  })

  if (!order) return <p>Order not found.</p>

  const amount = (order.totalCents / 100).toFixed(2)
  const status = order.payment?.status ?? 'PENDING'
  const variant = status === 'PAID' ? 'success' : status === 'CANCELLED' ? 'danger' : 'info'

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim()
  const razorpayOrderId = order.payment?.externalOrderId

  if (!razorpayKeyId) {
    return <div>Error: Payment configuration missing (Key ID).</div>
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center justify-between">
        Payment
        <Badge variant={variant}>{status}</Badge>
      </h1>

      <Card className="space-y-6 p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Order ID</span>
            <span className="font-mono text-foreground">#{order.id.slice(0, 8)}</span>
          </div>
          <div className="flex items-center justify-between text-lg font-medium">
            <span>Total Amount</span>
            <span>₹{amount}</span>
          </div>
        </div>

        {status !== 'PAID' && razorpayOrderId ? (
          <RazorpayCheckout
            orderId={order.id}
            amount={order.totalCents}
            currency="INR"
            razorpayKeyId={razorpayKeyId}
            razorpayOrderId={razorpayOrderId}
            name="College Canteen"
            description={`Order #${order.id.slice(0, 8)}`}
            prefill={{
              name: order.user?.name || '',
              email: order.user?.email || '',
              contact: ''
            }}
          />
        ) : status === 'PAID' ? (
          <div className="p-4 bg-green-50 text-green-700 rounded-md text-center font-medium">
            Payment successfully received!
          </div>
        ) : (
          <div className="text-red-500 text-center">
            Unable to initialize payment. Please try recreating the order.
          </div>
        )}
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        Secure payment via Razorpay. Vendors will be notified immediately after payment.
      </p>
      <div className="flex justify-center">
        <Link href="/order" className="btn-secondary text-sm">View all orders</Link>
      </div>
    </div>
  )
}
