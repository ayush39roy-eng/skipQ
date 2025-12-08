'use client'

import { useState, useMemo, useEffect } from 'react'
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'
import { Card } from '@/components/ui/Card'

type OrderData = {
    id: string
    totalCents: number
    vendorTakeCents?: number
    createdAt: Date | string
}

type TimeRange = 'daily' | 'weekly' | 'monthly'
type Metric = 'sales' | 'orders'

interface VendorAnalyticsChartsProps {
    orders: OrderData[]
}

export default function VendorAnalyticsCharts({ orders }: VendorAnalyticsChartsProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>('daily')
    const [metric, setMetric] = useState<Metric>('sales')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        // Helper to shift a date to IST (UTC+5:30)
        const toIST = (date: Date) => new Date(date.getTime() + (5.5 * 60 * 60 * 1000))

        const nowUTC = new Date()
        const nowIST = toIST(nowUTC)

        const data: { label: string; value: number; fullDate?: string }[] = []

        if (timeRange === 'daily') {
            // Initialize 24 hours
            for (let i = 0; i < 24; i++) {
                const hour = i % 12 || 12
                const ampm = i < 12 ? 'AM' : 'PM'
                data.push({ label: `${hour}${ampm}`, value: 0 })
            }

            const startOfDayIST = new Date(nowIST)
            startOfDayIST.setUTCHours(0, 0, 0, 0)

            orders.forEach(order => {
                const orderIST = toIST(new Date(order.createdAt))
                if (orderIST >= startOfDayIST) {
                    const hour = orderIST.getUTCHours()
                    const amount = (order.vendorTakeCents && order.vendorTakeCents > 0) ? order.vendorTakeCents : order.totalCents

                    if (metric === 'sales') {
                        data[hour].value += amount / 100
                    } else {
                        data[hour].value += 1
                    }
                }
            })
        } else if (timeRange === 'weekly') {
            // Last 7 days
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            for (let i = 6; i >= 0; i--) {
                const d = new Date(nowIST)
                d.setUTCDate(d.getUTCDate() - i)
                data.push({
                    label: days[d.getUTCDay()],
                    value: 0,
                    fullDate: d.toISOString().split('T')[0]
                })
            }

            const startOfWeekIST = new Date(nowIST)
            startOfWeekIST.setUTCDate(startOfWeekIST.getUTCDate() - 6)
            startOfWeekIST.setUTCHours(0, 0, 0, 0)

            orders.forEach(order => {
                const orderIST = toIST(new Date(order.createdAt))
                if (orderIST >= startOfWeekIST) {
                    const dateStr = orderIST.toISOString().split('T')[0]
                    const bucket = data.find(d => d.fullDate === dateStr)
                    if (bucket) {
                        const amount = (order.vendorTakeCents && order.vendorTakeCents > 0) ? order.vendorTakeCents : order.totalCents
                        if (metric === 'sales') {
                            bucket.value += amount / 100
                        } else {
                            bucket.value += 1
                        }
                    }
                }
            })
        } else if (timeRange === 'monthly') {
            // Current month days
            const daysInMonth = new Date(nowIST.getUTCFullYear(), nowIST.getUTCMonth() + 1, 0).getDate()
            for (let i = 1; i <= daysInMonth; i++) {
                data.push({ label: `${i}`, value: 0 })
            }

            const startOfMonthIST = new Date(nowIST)
            startOfMonthIST.setUTCDate(1)
            startOfMonthIST.setUTCHours(0, 0, 0, 0)

            orders.forEach(order => {
                const orderIST = toIST(new Date(order.createdAt))
                if (orderIST >= startOfMonthIST) {
                    const day = orderIST.getUTCDate()
                    const amount = (order.vendorTakeCents && order.vendorTakeCents > 0) ? order.vendorTakeCents : order.totalCents
                    if (metric === 'sales') {
                        data[day - 1].value += amount / 100
                    } else {
                        data[day - 1].value += 1
                    }
                }
            })
        }

        return data
    }, [orders, timeRange, metric])

    const formatValue = (val: number) => {
        if (metric === 'sales') return `₹${val.toFixed(0)}`
        return val.toString()
    }

    if (!mounted) return <div className="h-[300px] w-full bg-[rgb(var(--surface-muted))] animate-pulse rounded-lg" />

    return (
        <Card className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-semibold text-lg">Performance</h3>

                <div className="flex items-center gap-2 bg-[rgb(var(--surface-muted))] p-1 rounded-lg self-start sm:self-auto">
                    {(['daily', 'weekly', 'monthly'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTimeRange(t)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${timeRange === t
                                    ? 'bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow-sm'
                                    : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'
                                }`}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 bg-[rgb(var(--surface-muted))] p-1 rounded-lg self-start sm:self-auto">
                    {(['sales', 'orders'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMetric(m)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${metric === m
                                    ? 'bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow-sm'
                                    : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'
                                }`}
                        >
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[300px] w-full" style={{ minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="rgb(var(--accent))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="rgb(var(--accent))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--border))" />
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgb(var(--text-muted))', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgb(var(--text-muted))', fontSize: 12 }}
                            tickFormatter={formatValue}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgb(var(--surface))',
                                borderColor: 'rgb(var(--border))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            formatter={(value: number) => [formatValue(value), metric === 'sales' ? 'Sales' : 'Orders']}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="rgb(var(--accent))"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    )
}
