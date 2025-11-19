import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Card } from '@/components/ui/Card'
import VendorDashboardClient from './vendor-dashboard-client'

export const dynamic = 'force-dynamic'

type SerializableOrder = {
  id: string
  status: string
  totalCents: number
  fulfillmentType: string
  prepMinutes: number | null
  createdAt: string
  updatedAt: string
  canteen: { id: string; name: string }
  user: { name: string | null } | null
  items: Array<{
    id: string
    quantity: number
    priceCents: number
    menuItem: { name: string | null } | null
  }>

}

type OrderWithRelations = {
  id: string
  status: string
  totalCents: number
  fulfillmentType?: string
  prepMinutes: number | null
  createdAt: Date
  updatedAt: Date
  canteen: { id: string; name: string }
  user: { name: string | null } | null
  items: Array<{
    id: string
    quantity: number
    priceCents: number
    menuItem: { name: string | null } | null
  }>
}


export default async function VendorPage() {
  const session = await requireRole(['VENDOR'])
  if (!session) {
    return <p className="text-[rgb(var(--text))]">Unauthorized</p>
  }

  const vendorId = session.user.vendorId
  if (!vendorId) {
    return (
      <Card className="mt-10 text-center text-[rgb(var(--text))]">
        <h1 className="text-2xl font-semibold">No vendor linked</h1>
        <p className="mt-2 text-[rgb(var(--text-muted))]">Ask an admin to associate your account with a vendor profile to view orders.</p>
      </Card>
    )
  }

  const [vendor, orders] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { name: true } }),
    prisma.order.findMany({
      where: {
        vendorId,
        status: { in: ['PAID', 'CONFIRMED'] }
      },
      include: {
        canteen: { select: { id: true, name: true } },
        user: { select: { name: true } },
        items: {
          include: { menuItem: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  ])

  const typedOrders = orders as OrderWithRelations[]
  const initialOrders: SerializableOrder[] = typedOrders.map((order) => ({
    id: order.id,
    status: order.status,
    totalCents: order.totalCents,
    fulfillmentType: order.fulfillmentType ?? 'TAKEAWAY',
    prepMinutes: order.prepMinutes ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    canteen: { id: order.canteen.id, name: order.canteen.name },
    user: order.user ? { name: order.user.name } : null,
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      priceCents: item.priceCents,
      menuItem: item.menuItem ? { name: item.menuItem.name ?? null } : null
    }))
  }))

  return <VendorDashboardClient vendorName={vendor?.name ?? null} initialOrders={initialOrders} />
}
