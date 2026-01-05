import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'
import VendorAnalyticsCharts from './VendorAnalyticsCharts'

export const dynamic = 'force-dynamic'

// Helper to shift a date to IST (UTC+5:30)
// We add the offset to the timestamp, so the resulting Date object's UTC methods return IST values.
function toIST(date: Date) {
    return new Date(date.getTime() + (5.5 * 60 * 60 * 1000))
}

function getStartOfDayIST(istDate: Date) {
    const d = new Date(istDate)
    d.setUTCHours(0, 0, 0, 0)
    return d
}

function getStartOfWeekIST(istDate: Date) {
    const d = new Date(istDate)
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    d.setUTCDate(diff)
    d.setUTCHours(0, 0, 0, 0)
    return d
}

function getStartOfMonthIST(istDate: Date) {
    const d = new Date(istDate)
    d.setUTCDate(1)
    d.setUTCHours(0, 0, 0, 0)
    return d
}

export default async function VendorAnalyticsPage() {
    const session = await requireRole(['VENDOR'])
    if (!session) return <div className="p-8">Unauthorized</div>

    const vendorId = session.user.vendorId
    if (!vendorId) return <div className="p-8">No vendor linked</div>

    // Fetch all completed/paid orders
    const orders = await prisma.order.findMany({
        where: {
            vendorId,
            status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] },
            orderType: 'SELF_ORDER' // GEOFENCING: Analytics only for on-site orders
        },
        select: {
            id: true,
            totalCents: true,
            vendorTakeCents: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' }
    })

    const nowUTC = new Date()
    const nowIST = toIST(nowUTC)

    const startOfDayIST = getStartOfDayIST(nowIST)
    const startOfWeekIST = getStartOfWeekIST(nowIST)
    const startOfMonthIST = getStartOfMonthIST(nowIST)

    let dailySales = 0
    let weeklySales = 0
    let monthlySales = 0
    let totalSales = 0

    const hoursMap = new Array(24).fill(0)

    for (const o of orders) {
        // Use vendorTakeCents if available (net earnings), otherwise fallback to totalCents (gross)
        const amount = (o.vendorTakeCents && o.vendorTakeCents > 0) ? o.vendorTakeCents : o.totalCents

        // Convert order time to IST
        const orderIST = toIST(new Date(o.createdAt))

        totalSales += amount
        if (orderIST >= startOfDayIST) dailySales += amount
        if (orderIST >= startOfWeekIST) weeklySales += amount
        if (orderIST >= startOfMonthIST) monthlySales += amount

        // Peak hours (IST)
        // Since orderIST is already shifted, getUTCHours gives us the IST hour
        const istHours = orderIST.getUTCHours()
        hoursMap[istHours]++
    }

    const totalOrders = orders.length
    const aov = totalOrders > 0 ? totalSales / totalOrders : 0

    // Find peak hours (top 3)
    const peakHours = hoursMap
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .filter(p => p.count > 0)

    const formatCurrency = (cents: number) => `₹${(cents / 100).toFixed(2)}`

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Analytics</h1>
                    <p className="text-sm text-[rgb(var(--text-muted))]">Insights for {session.user.name}</p>
                </div>
                <Link href="/vendor" className="btn-secondary">Back to Dashboard</Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4 space-y-1">
                    <p className="text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">Daily Sales</p>
                    <p className="text-2xl font-bold">{formatCurrency(dailySales)}</p>
                </Card>
                <Card className="p-4 space-y-1">
                    <p className="text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">Weekly Sales</p>
                    <p className="text-2xl font-bold">{formatCurrency(weeklySales)}</p>
                </Card>
                <Card className="p-4 space-y-1">
                    <p className="text-xs uppercase tracking-wider text-[rgb(var(--text-muted))]">Monthly Sales</p>
                    <p className="text-2xl font-bold">{formatCurrency(monthlySales)}</p>
                </Card>
            </div>

            <VendorAnalyticsCharts orders={orders.map(o => ({
                id: o.id,
                totalCents: o.totalCents,
                vendorTakeCents: o.vendorTakeCents,
                createdAt: o.createdAt.toISOString()
            }))} />

            <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-6 space-y-4">
                    <h3 className="font-semibold">Order Stats</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-[rgb(var(--text-muted))]">Total Orders</span>
                            <span className="font-medium">{totalOrders}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[rgb(var(--text-muted))]">Average Order Value</span>
                            <span className="font-medium">{formatCurrency(aov)}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 space-y-4">
                    <h3 className="font-semibold">Peak Hours</h3>
                    {peakHours.length > 0 ? (
                        <div className="space-y-3">
                            {peakHours.map(({ hour, count }) => (
                                <div key={hour} className="flex items-center gap-3">
                                    <div className="w-16 text-sm font-medium">{hour % 12 || 12} {hour >= 12 ? 'PM' : 'AM'}</div>
                                    <div className="flex-1 h-2 bg-[rgb(var(--surface-muted))] rounded-full overflow-hidden">
                                        <div className="h-full bg-[rgb(var(--accent))]" style={{ width: `${(count / orders.length) * 100}%` }} />
                                    </div>
                                    <div className="text-xs text-[rgb(var(--text-muted))]">{count} orders</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-[rgb(var(--text-muted))]">No data available</p>
                    )}
                </Card>
            </div>
        </div>
    )
}
