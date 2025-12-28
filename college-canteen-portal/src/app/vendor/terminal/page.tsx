import { prisma } from '@/lib/prisma'
import { TerminalLayout } from '@/components/vendor/terminal/TerminalLayout'
import { VendorItem, VendorOrder, LedgerEntry, FulfillmentType, OrderSource, OrderStatus, PaymentMode } from '@/types/vendor'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function TerminalPage() {
  const session = await getSession()
  if (!session || session.role !== 'VENDOR' || !session.user.vendorId) {
    console.log("TerminalPage: Redirecting - Invalid Session or missing VendorID")
    redirect('/auth/login?callbackUrl=/vendor/terminal')
  }
  
  const vendorId = session.user.vendorId
  console.log("TerminalPage: Fetching for VendorID:", vendorId)

  // Pre-fetch Canteen ID to ensure reliable item lookup
  const canteen = await prisma.canteen.findFirst({
      where: { vendorId },
      select: { id: true }
  })
  
  if (!canteen) {
    redirect('/vendor/settings?setup=required')
  }

  const canteenId = canteen.id

  // Parallel Data Fetching
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let menuItemsRaw: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let activeOrdersRaw: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let transactionsRaw: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let analyticsRaw: any[] = []

  try {
    [menuItemsRaw, activeOrdersRaw, transactionsRaw, analyticsRaw] = await Promise.all([
    // 1. Menu Items (Filtered by Canteen)
    canteenId ? prisma.menuItem.findMany({
      where: { canteenId },
      select: {
        id: true,
        name: true,
        priceCents: true,
        section: { select: { name: true } },
        available: true,
        isVegetarian: true,
        canteenId: true // Debug
      },
      orderBy: { name: 'asc' }
    }) : Promise.resolve([]),
    
    // 2. Orders (Filtered by Vendor)
    prisma.order.findMany({
      where: {
        vendorId: vendorId,
        status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] }
      },
      select: {
        id: true,
        status: true,
        source: true,
        totalCents: true,
        fulfillmentType: true,
        createdAt: true,
        items: {
          select: {
            id: true, // Need ID for key
            quantity: true,
            menuItem: {
              select: { id: true, name: true, priceCents: true }
            }
          }
        },
        payment: {
            select: {
                provider: true,
                status: true
            }
        },
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    }),

    // 3. Transactions (Filtered by Vendor)
    prisma.transaction.findMany({
        where: { vendorId: vendorId },
        orderBy: { createdAt: 'desc' },
        take: 50
    }),

    // 4. Analytics Data (Today's Orders)
    prisma.order.findMany({
      where: {
        vendorId: vendorId,
        createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) }, // Since Midnight
        status: { not: 'CANCELLED' }
      },
      include: {
        items: { include: { menuItem: true } }
      }
    })
    ])
  } catch (error) {
    console.error("TerminalPage: Data Fetch Error", error)
  }

  // -- AGGREGATION --
  const ordersToday = analyticsRaw
  const totalRevenue = ordersToday.reduce((sum, o) => sum + o.totalCents, 0)
  const totalOrders = ordersToday.length
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  
  // Hourly Traffic for Chart
  const hourlyMap = new Array(24).fill(0)
  ordersToday.forEach((o) => {
      const hour = o.createdAt.getHours()
      hourlyMap[hour] += o.totalCents / 100
  })
  const hourlyTraffic = hourlyMap.map((val, h) => ({
      hour: `${h}:00`,
      sales: val
  })).filter((_val, i) => i >= 8 && i <= 22) // Filter relevant business hours (8am - 10pm)

  // Top Items
  const itemCounts: Record<string, number> = {}
  ordersToday.forEach((o) => {
      o.items.forEach((i: { menuItem: { name: string }; quantity: number }) => {
          itemCounts[i.menuItem.name] = (itemCounts[i.menuItem.name] || 0) + i.quantity
      })
  })
  const topItems = Object.entries(itemCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  const analyticsData = {
      revenue: totalRevenue,
      orders: totalOrders,
      avgValue: avgOrderValue,
      hourlyTraffic,
      topItems
  }

  // -- TRANSFORMERS --

  // 1. Format Menu Items
  const menuItems: VendorItem[] = menuItemsRaw.map(item => ({
    id: item.id,
    name: item.name,
    priceCents: item.priceCents,
    section: item.section?.name || 'Other',
    available: item.available,
    isVegetarian: item.isVegetarian
  }))

  // 2. Format Orders
  const initialOrders: VendorOrder[] = activeOrdersRaw.map(o => {
    // Use explicit source field (default to COUNTER for older orders without source)
    const source: OrderSource = (o.source === 'ONLINE' || o.source === 'COUNTER') ? o.source : 'COUNTER'
    
    return {
      id: o.id,
      ticket: `#${o.id.slice(-4).toUpperCase()}`,
      source,
      status: o.status as OrderStatus,
      items: o.items.map((i: { menuItem: { id: string; name: string; priceCents: number }; quantity: number }) => ({
        itemId: i.menuItem.id,
        name: i.menuItem.name,
        priceCents: i.menuItem.priceCents,
        quantity: i.quantity
      })),
      totalCents: o.totalCents,
      paymentStatus: (() => {
        const s = o.payment?.status
        if (!s) return 'UNPAID'
        const map: Record<string, 'PAID' | 'PENDING' | 'FAILED' | 'UNKNOWN'> = {
            'SUCCESS': 'PAID', 'PAID': 'PAID', 'COMPLETED': 'PAID',
            'PENDING': 'PENDING', 'PROCESSING': 'PENDING',
            'FAILED': 'FAILED'
        }
        return map[s] || 'UNKNOWN'
      })(),
      paymentMode: (o.payment?.provider ? o.payment.provider.toUpperCase() : 'CASH') as PaymentMode,
      fulfillmentType: (o.fulfillmentType as FulfillmentType) || 'TAKEAWAY',
      createdAt: o.createdAt
    }
  })

  // 3. Format Ledger
  const initialLedger: LedgerEntry[] = transactionsRaw.map((t) => ({
      id: t.id,
      timestamp: t.createdAt,
      orderId: t.orderId || 'N/A', 
      type: (['SALE', 'REFUND', 'EXPENSE', 'PAYOUT'].includes(t.type)) ? t.type as 'SALE' | 'REFUND' | 'EXPENSE' | 'PAYOUT' : 'OTHER' as const,
      description: t.description,
      amountCents: (t.type === 'REFUND' || t.type === 'EXPENSE') ? -t.amountCents : t.amountCents,
      paymentMode: t.paymentMode || 'UNKNOWN',
      source: t.source || 'UNKNOWN'
  }))

  return (
    <div className="w-full h-screen bg-slate-100">
      <TerminalLayout 
        menuItems={menuItems} 
        initialOrders={initialOrders}
        initialLedger={initialLedger}
        analyticsData={analyticsData}
        vendorId={vendorId}
      />
    </div>
  )
}
