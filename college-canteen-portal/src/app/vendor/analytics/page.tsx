import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function getStartOfDay(date: Date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

function getStartOfWeek(date: Date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
}

function getStartOfMonth(date: Date) {
    const d = new Date(date)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
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
            status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] }
        },
        select: {
            id: true,
            totalCents: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' }
    })

    const now = new Date()
    const startOfDay = getStartOfDay(now)
    const startOfWeek = getStartOfWeek(now)
    const startOfMonth = getStartOfMonth(now)

    let dailySales = 0
    let weeklySales = 0
    let monthlySales = 0
    let totalSales = 0

    const hoursMap = new Array(24).fill(0)

    for (const o of orders) {
        const amount = o.totalCents
        const d = new Date(o.createdAt)

        totalSales += amount
        if (d >= startOfDay) dailySales += amount
        if (d >= startOfWeek) weeklySales += amount
        if (d >= startOfMonth) monthlySales += amount

        // Peak hours (IST conversion)
        const utcHours = d.getUTCHours()
        const utcMinutes = d.getUTCMinutes()
        let istHours = utcHours + 5
        let istMinutes = utcMinutes + 30
        if (istMinutes >= 60) {
            istMinutes -= 60
            istHours += 1
        }
        if (istHours >= 24) istHours -= 24

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
