'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths, format, eachHourOfInterval, eachDayOfInterval } from 'date-fns'

export type TimeRange = 'daily' | 'weekly' | 'monthly'

export interface ReportData {
  summary: {
    revenue: number
    orders: number
    avgOrderValue: number
    revenueRes: number // percentage change
    ordersRes: number // percentage change
    avgOrderValueRes: number // percentage change
  }
  chartData: {
    label: string
    revenue: number
    orders: number
  }[]
  topProducts: {
    id: string
    name: string
    revenue: number
    quantity: number
  }[]
}

export async function getVendorReports(timeRange: TimeRange): Promise<{ success: boolean; data?: ReportData; error?: string }> {
  try {
    const session = await getSession()
    if (!session || session.role !== 'VENDOR') {
      return { success: false, error: 'Unauthorized' }
    }

    const vendorId = session.user.vendorId
    if (!vendorId) return { success: false, error: 'Vendor ID not found' }

    const now = new Date()
    let currentStart: Date, currentEnd: Date
    let previousStart: Date, previousEnd: Date

    // Determine date ranges based on timeRange
    if (timeRange === 'daily') {
      currentStart = startOfDay(now)
      currentEnd = endOfDay(now)
      previousStart = startOfDay(subDays(now, 1))
      previousEnd = endOfDay(subDays(now, 1))
    } else if (timeRange === 'weekly') {
      currentStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday start
      currentEnd = endOfWeek(now, { weekStartsOn: 1 })
      previousStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      previousEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    } else { // monthly
      currentStart = startOfMonth(now)
      currentEnd = endOfMonth(now)
      previousStart = startOfMonth(subMonths(now, 1))
      previousEnd = endOfMonth(subMonths(now, 1))
    }

    // specific fix for prisma query to ensure dates are valid Date objects
    currentStart = new Date(currentStart)
    currentEnd = new Date(currentEnd)
    previousStart = new Date(previousStart)
    previousEnd = new Date(previousEnd)

    // Fetch Current Period Orders
    const currentOrders = await prisma.order.findMany({
      where: {
        vendorId,
        status: { not: 'CANCELLED' },
        createdAt: {
          gte: currentStart,
          lte: currentEnd
        }
      },
      include: {
        items: {
          include: {
            menuItem: true
          }
        }
      }
    })

    // Fetch Previous Period Orders (for comparison)
    const previousOrders = await prisma.order.findMany({
      where: {
        vendorId,
        status: { not: 'CANCELLED' },
        createdAt: {
          gte: previousStart,
          lte: previousEnd
        }
      }
    })

    // -- CALCULATE SUMMARY --
    const calculateMetrics = (orders: { vendorTakeCents: number | null; totalCents: number }[]) => {
      const revenue = orders.reduce((sum, order) => sum + (order.vendorTakeCents || order.totalCents), 0)
      const count = orders.length
      const avgOrderValue = count > 0 ? revenue / count : 0
      return { revenue, count, avgOrderValue }
    }

    const currentMetrics = calculateMetrics(currentOrders)
    const previousMetrics = calculateMetrics(previousOrders)

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    const summary = {
      revenue: currentMetrics.revenue / 100,
      orders: currentMetrics.count,
      avgOrderValue: currentMetrics.avgOrderValue / 100,
      revenueRes: calculateGrowth(currentMetrics.revenue, previousMetrics.revenue),
      ordersRes: calculateGrowth(currentMetrics.count, previousMetrics.count),
      avgOrderValueRes: calculateGrowth(currentMetrics.avgOrderValue, previousMetrics.avgOrderValue)
    }

    // -- PREPARE CHART DATA --
    let chartData: { label: string; revenue: number; orders: number }[] = []

    if (timeRange === 'daily') {
      const hours = eachHourOfInterval({ start: currentStart, end: currentEnd })
      chartData = hours.map(hour => {
        const nextHour = new Date(hour.getTime() + 60 * 60 * 1000)
        const ordersInHour = currentOrders.filter(o => o.createdAt >= hour && o.createdAt < nextHour)
        const metrics = calculateMetrics(ordersInHour)
        return {
          label: format(hour, 'HH:mm'),
          revenue: metrics.revenue / 100, // Convert to main currency unit for chart
          orders: metrics.count
        }
      })
    } else {
      // Weekly or Monthly - group by day
      const days = eachDayOfInterval({ start: currentStart, end: currentEnd > now ? now : currentEnd })
      chartData = days.map(day => {
        const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000)
        const ordersInDay = currentOrders.filter(o => o.createdAt >= day && o.createdAt < nextDay)
        const metrics = calculateMetrics(ordersInDay)
        return {
          label: format(day, 'MMM dd'),
          revenue: metrics.revenue / 100,
          orders: metrics.count
        }
      })
    }

    // -- TOP PRODUCTS --
    const productMap = new Map<string, { name: string; revenue: number; quantity: number }>()

    currentOrders.forEach(order => {
      order.items.forEach(item => {
        const existing = productMap.get(item.menuItemId)
        if (existing) {
          existing.revenue += item.priceCents * item.quantity
          existing.quantity += item.quantity
        } else {
          productMap.set(item.menuItemId, {
            name: item.menuItem?.name || 'Unknown Item',
            revenue: item.priceCents * item.quantity,
            quantity: item.quantity
          })
        }
      })
    })

    const topProducts = Array.from(productMap.entries())
      .map(([id, data]) => ({ 
        id, 
        ...data,
        revenue: data.revenue / 100 // Convert to main currency unit
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10) // Top 10

    return {
      success: true,
      data: {
        summary,
        chartData,
        topProducts
      }
    }

  } catch (error) {
    console.error('Error fetching vendor reports:', error)
    return { success: false, error: 'Failed to fetch reports' }
  }
}
