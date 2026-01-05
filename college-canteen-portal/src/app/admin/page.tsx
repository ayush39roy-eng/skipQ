'use client'

import { useState, useEffect } from 'react'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { 
  ShoppingBag, 
  IndianRupee, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowRight,
  FileText,
  Activity,
  Banknote,
  Search
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Admin Overview Dashboard
 * 
 * Cockpit view: System health, alerts, and key metrics.
 * Focus on alerts, not visuals.
 */

type DashboardMetrics = {
  ordersToday: number
  revenueToday: number
  pendingLiabilities: number
  failedPayments: number
  pendingRefunds: number
  pendingSettlements: number
}

type Alert = {
  id: string
  type: 'error' | 'warning' | 'info'
  message: string
  timestamp: string
}

export default function AdminOverview() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
      const data = await response.json()
      
      if (response.ok) {
        setMetrics(data.metrics)
        setAlerts(data.alerts || [])
      } else {
        console.error('Failed to fetch dashboard:', data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
        <p className="text-sm text-slate-500 mt-1">System health and key metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Orders Today"
          value={metrics.ordersToday}
          subtitle="Total volume"
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <StatCard
          title="Revenue Today"
          value={`₹${(metrics.revenueToday / 100).toFixed(2)}`}
          subtitle="Platform fees collected"
          icon={<IndianRupee className="h-5 w-5" />}
          trend={{ value: 'Real-time', positive: true, neutral: true }}
        />
        <StatCard
          title="Pending Liabilities"
          value={`₹${(metrics.pendingLiabilities / 100).toFixed(2)}`}
          subtitle="Unsettled vendor balance"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatCard
          title="Failed Payments"
          value={metrics.failedPayments}
          subtitle="Last 24 hours"
          alert={metrics.failedPayments > 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={metrics.failedPayments > 0 ? { value: 'Attention needed', positive: false } : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alerts Section */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            Alerts & Action Items
          </h2>
          
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {alerts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                <CheckCircle className="h-8 w-8 text-emerald-500 mb-3" />
                <p>No active alerts. System is healthy.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                    <div className={cn(
                      "mt-0.5 rounded-full p-1",
                      alert.type === 'error' ? "text-rose-600 bg-rose-50" :
                      alert.type === 'warning' ? "text-amber-600 bg-amber-50" :
                      "text-blue-600 bg-blue-50"
                    )}>
                      {alert.type === 'error' ? <AlertTriangle className="h-4 w-4" /> :
                       alert.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                       <Info className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{alert.message}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={alert.type} variant={alert.type as any} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
             <Search className="h-4 w-4 text-slate-500" />
             Quick Actions
          </h2>
          <div className="grid gap-3">
            <Link 
              href="/admin/settlements" 
              className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                  <Banknote className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">Generate Settlement</div>
                  <div className="text-xs text-slate-500">Run payouts for vendors</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link 
              href="/admin/reports" 
              className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">Financial Reports</div>
                  <div className="text-xs text-slate-500">View revenue & liablities</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link 
              href="/admin/reconciliation" 
              className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                  <Activity className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">Run Reconciliation</div>
                  <div className="text-xs text-slate-500">Verify ledger integrity</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
