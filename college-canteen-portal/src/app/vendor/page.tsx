import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Card } from '@/components/ui/Card'
import { redirect } from 'next/navigation'
import VendorDashboardClient from './vendor-dashboard-client'
import { VendorMode } from '@/types/vendor'

export const dynamic = 'force-dynamic'

type SerializableOrder = {
  id: string
  status: string
  totalCents: number
  fulfillmentType: string
  prepMinutes: number | null
  prepExtended?: boolean
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
  prepExtended?: boolean
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


export default async function VendorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
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

  const [vendor, liveOrders, stats, allOrderItems] = await Promise.all([
    prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        name: true,
        mode: true,
        canteens: {
          select: {
            id: true,
            name: true,
            openingTime: true,
            closingTime: true,
            weeklySchedule: true,
            autoMode: true,
            manualIsOpen: true,
            menuItems: {
              select: {
                id: true,
                name: true,
                available: true,
                priceCents: true,
                section: { select: { name: true } }
              },
              orderBy: { name: 'asc' }
            }
          }
        }
      }
    } as any),
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
    }),
    prisma.order.aggregate({
      where: {
        vendorId,
        status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] }
      },
      _sum: { vendorTakeCents: true },
      _count: true
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          vendorId,
          status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] }
        }
      },
      select: { quantity: true, menuItem: { select: { name: true } } }
    })
  ])

  // Calculate popular items
  const itemCounts: Record<string, number> = {}
  for (const item of allOrderItems) {
    const name = item.menuItem?.name
    // Skip entries with no linked menuItem or no name
    if (!item.menuItem || !name) continue
    itemCounts[name] = (itemCounts[name] || 0) + item.quantity
  }

  const popularItems = Object.entries(itemCounts)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  const dashboardStats = {
    totalRevenue: stats._sum.vendorTakeCents ?? 0,
    totalOrders: stats._count,
    popularItems
  }

  const typedOrders = liveOrders as OrderWithRelations[]
  const initialOrders: SerializableOrder[] = typedOrders.map((order) => ({
    id: order.id,
    status: order.status,
    totalCents: order.totalCents,
    fulfillmentType: order.fulfillmentType ?? 'TAKEAWAY',
    prepMinutes: order.prepMinutes ?? null,
    prepExtended: !!order.prepExtended,
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

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const canteensWithMenu = ((vendor as any)?.canteens ?? []).map((c: any) => ({
    ...c,
    manualIsOpen: c.manualIsOpen ?? false,
    menuItems: c.menuItems.map((m: any) => ({
      ...m,
      sectionName: m.section?.name ?? 'Uncategorized'
    }))
  }))

  if ((vendor as any)?.mode === 'FULL_POS' && !params?.dashboard) {
      redirect('/vendor/terminal')
  }

  return <VendorDashboardClient vendorName={vendor?.name ?? null} canteens={canteensWithMenu} initialOrders={initialOrders} stats={dashboardStats} />
}
