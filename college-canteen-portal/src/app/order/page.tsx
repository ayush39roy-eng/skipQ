import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
        <Link href="/canteens" className="game-btn px-6 py-2">Order from canteens</Link>
      </div>

      {orders.length === 0 ? (
        <div className="game-card rounded-xl p-6 text-center text-sm text-gray-600 font-bold border-2 border-dashed">
          No orders yet. Browse canteens and start an order.
        </div>      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const amount = (order.totalCents / 100).toFixed(2)
            const paymentStatus = order.payment?.status ?? 'PENDING'
            const createdLabel = formatOrderTimestamp(order.createdAt)
            const createdIso = order.createdAt.toISOString()
            return (
              <div key={order.id} className="game-card rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-black text-black">{order.canteen.name}</p>
                    <p className="text-xs font-bold text-gray-500">Ticket #{getTicketNumber(order.id)}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={statusVariant(order.status)} className="border-2 border-black font-bold">{order.status}</Badge>
                    <p className="text-sm font-bold text-gray-600">₹{amount}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-gray-500">
                  <span>Payment: {paymentStatus}</span>
                  <time suppressHydrationWarning dateTime={createdIso}>{createdLabel}</time>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/order/${order.id}`} className="game-btn px-4 py-1.5 text-xs">View ticket</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}