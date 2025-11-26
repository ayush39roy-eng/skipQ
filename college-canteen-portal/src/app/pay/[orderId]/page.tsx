import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RazorpayCheckout } from '@/components/RazorpayCheckout'

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true, user: true, items: { include: { menuItem: true } } }
  })

  if (!order) return <p>Order not found.</p>

  const session = await getSession()
  if (!session) {
    // If user is not signed in, direct them to sign up (not login) before payment
    const next = encodeURIComponent(`/pay/${orderId}`)
    return (
      <div className="max-w-md mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold">Sign up to complete payment</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">You need an account to pay for orders. Create an account to continue.</p>
        <div className="flex gap-3">
          <Link href={`/register?next=${next}`} className="btn">Create account</Link>
          <Link href="/" className="btn-secondary">Back to menus</Link>
        </div>
      </div>
    )
  }

  const isOwner = session.userId === order.userId
  const isAdmin = session.role === 'ADMIN'
  const isVendor = session.role === 'VENDOR' && session.user.vendorId === order.vendorId

  if (!isOwner && !isAdmin && !isVendor) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="p-4 bg-red-50 text-red-700 rounded-md text-center font-medium">
          You are not authorized to view this payment page.
        </div>
      </div>
    )
  }

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
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Order ID</span>
            <span className="font-mono text-foreground">#{order.id.slice(0, 8)}</span>
          </div>

          <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/30 p-3">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Items</p>
            <ul className="space-y-2 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>{item.menuItem.name} <span className="text-muted-foreground">×{item.quantity}</span></span>
                  <span>₹{(item.priceCents * item.quantity / 100).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between text-lg font-medium pt-2 border-t border-[rgb(var(--border))]">
            <span>Total Amount</span>
            <span>₹{amount}</span>
          </div>
        </div>

        {status === 'PENDING' && razorpayOrderId ? (
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
        ) : status === 'CANCELLED' ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-md text-center font-medium">
            Order cancelled. Payment is not available for cancelled orders.
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
