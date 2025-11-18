import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const formatCurrency = (cents: number) => `₹${(cents / 100).toFixed(2)}`

const formatRelativeTime = (date: Date) => {
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

const statusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'PAID':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'info'
  }
}

export default async function VendorHistoryPage() {
  const session = await requireRole(['VENDOR'])
  if (!session) return <p>Unauthorized</p>
  const vendorId = session.user.vendorId
  if (!vendorId) {
    return (
      <Card className="mt-10 text-center text-[rgb(var(--text))]">
        <h1 className="text-2xl font-semibold">No vendor linked</h1>
        <p className="mt-2 text-muted">Ask an admin to associate your account with a vendor profile to view orders.</p>
      </Card>
    )
  }

  const orders = await prisma.order.findMany({
    where: { vendorId },
    include: { canteen: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  return (
    <div className="space-y-6 text-[rgb(var(--text))]">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Vendor history</p>
        <h1 className="text-3xl font-semibold">Last {orders.length} orders</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">Download payouts or audit prep promises here.</p>
      </div>
      <div className="space-y-4">
        {orders.length === 0 && (
          <Card className="text-center text-sm text-[rgb(var(--text-muted))]">
            No orders yet. Once students start paying, they will appear here.
          </Card>
        )}
        {orders.map((order) => (
          <Card key={order.id} className="flex flex-wrap items-center gap-4 border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
            <div className="min-w-[200px]">
              <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">{order.canteen.name}</p>
              <p className="text-base font-semibold">#{order.id.slice(-6).toUpperCase()}</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">Placed {formatRelativeTime(order.createdAt)}</p>
            </div>
            <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
            <div className="ml-auto text-right">
              <p className="text-lg font-semibold">{formatCurrency(order.totalCents)}</p>
              <p className="text-xs text-[rgb(var(--text-muted))]">Updated {formatRelativeTime(order.updatedAt)}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
