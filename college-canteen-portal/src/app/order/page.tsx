import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getTicketNumber } from '@/lib/order-ticket'

const statusVariant = (status: string): 'success' | 'danger' | 'info' | 'warning' => {
  if (['PAID', 'CONFIRMED', 'COMPLETED'].includes(status)) return 'success'
  if (status === 'CANCELLED') return 'danger'
  if (status === 'PENDING') return 'warning'
  return 'info'
}

// Use a pinned locale and timezone so hydration never disagrees on formatted timestamps.
const orderTimestampFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata'
})

const formatOrderTimestamp = (date: Date) => orderTimestampFormatter.format(date)

export default async function OrderHistoryPage() {
  const session = await requireRole(['USER'])
  if (!session) {
    redirect('/login?next=/order')
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: session.userId,
      status: { in: ['PENDING', 'PAID', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] }
    },
    orderBy: { createdAt: 'desc' },
    include: { canteen: true, payment: true }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Your orders</h1>
          <p className="text-sm text-muted">Track live tickets or revisit older receipts.</p>
        </div>
        <Link href="/canteens" className="btn">Order from canteens</Link>
      </div>

      {orders.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          No orders yet. Browse canteens and start an order.
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const amount = (order.totalCents / 100).toFixed(2)
            const paymentStatus = order.payment?.status ?? 'PENDING'
            const createdLabel = formatOrderTimestamp(order.createdAt)
            const createdIso = order.createdAt.toISOString()
            return (
              <Card key={order.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{order.canteen.name}</p>
                    <p className="text-xs text-muted">Ticket #{getTicketNumber(order.id)}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                    <p className="text-sm text-muted">₹{amount}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
                  <span>Payment: {paymentStatus}</span>
                  <time suppressHydrationWarning dateTime={createdIso}>{createdLabel}</time>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/order/${order.id}`} className="btn-secondary text-sm">View ticket</Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}