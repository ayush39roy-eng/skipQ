'use client'

import { useState, useEffect } from 'react'
import { StatCard } from '@/components/admin/StatCard'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { CreditCard, Webhook, AlertTriangle, Scale, RefreshCw, Activity } from 'lucide-react'

/**
 * System Health Page
 * 
 * Monitor payment gateway, webhooks, and system errors.
 */

type SystemHealth = {
  paymentGateway: {
    status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN'
    lastChecked: string
  }
  webhooks: {
    averageDelay: number
    failedLast24h: number
  }
  orders: {
    failureRate: number
    lastHour: number
  }
  reconciliation: {
    status: 'PASS' | 'FAIL'
    lastRun: string
  }
}

type SystemError = {
  id: string
  timestamp: string
  type: string
  message: string
  count: number
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [errors, setErrors] = useState<SystemError[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHealth()
  }, [])

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/admin/health')
      const data = await response.json()
      setHealth(data.health)
      setErrors(data.recentErrors || [])
    } catch (error) {
      console.error('Failed to fetch health:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !health) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Health</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor system status and errors</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          onClick={fetchHealth}
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Payment Gateway"
          value={health.paymentGateway.status}
          subtitle={`Last checked: ${new Date(health.paymentGateway.lastChecked).toLocaleTimeString()}`}
          alert={health.paymentGateway.status !== 'OPERATIONAL'}
          icon={<CreditCard className="h-5 w-5" />}
          trend={health.paymentGateway.status === 'OPERATIONAL' ? { value: 'Online', positive: true } : { value: 'Issues Detected', positive: false }}
        />
        <StatCard
          title="Webhook Delay"
          value={`${health.webhooks.averageDelay}ms`}
          subtitle={`${health.webhooks.failedLast24h} failed (24h)`}
          alert={health.webhooks.averageDelay > 1000}
          icon={<Webhook className="h-5 w-5" />}
          trend={{ value: 'Avg Latency', positive: health.webhooks.averageDelay < 500, neutral: true }}
        />
        <StatCard
          title="Order Failure Rate"
          value={`${(health.orders.failureRate * 100).toFixed(1)}%`}
          subtitle={`${health.orders.lastHour} orders (last hour)`}
          alert={health.orders.failureRate > 0.05}
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={{ value: 'Last Hour', positive: health.orders.failureRate < 0.01 }}
        />
        <StatCard
          title="Reconciliation"
          value={health.reconciliation.status}
          subtitle={`Last run: ${new Date(health.reconciliation.lastRun).toLocaleTimeString()}`}
          alert={health.reconciliation.status === 'FAIL'}
          icon={<Scale className="h-5 w-5" />}
          trend={health.reconciliation.status === 'PASS' ? { value: 'Balanced', positive: true } : { value: 'Discrepancy', positive: false }}
        />
      </div>

      {/* Recent Errors */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Recent Errors</h2>
        </div>
        
        {errors.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p>No recent errors. System is healthy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-xs font-medium">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Message</th>
                  <th className="px-6 py-3 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {errors.map((error) => (
                  <tr key={error.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap font-mono">{new Date(error.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4"><StatusBadge status={error.type} variant="error" /></td>
                    <td className="px-6 py-4 text-slate-900 font-medium">{error.message}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600">{error.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
