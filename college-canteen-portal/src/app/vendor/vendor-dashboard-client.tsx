'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

type MenuItemPayload = {
  id: string
  quantity: number
  priceCents: number
  menuItem?: { name?: string | null } | null
}

type VendorOrderPayload = {
  id: string
  status: string
  totalCents: number
  fulfillmentType: string
  prepMinutes: number | null
  createdAt: string
  updatedAt: string
  canteen: { id: string; name: string }
  user?: { name: string | null } | null
  items: MenuItemPayload[]
}

type Props = {
  vendorName: string | null
  initialOrders: VendorOrderPayload[]
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

const formatCurrency = (cents: number) => `₹${(cents / 100).toFixed(2)}`

const formatRelativeTime = (isoDate: string) => {
  const date = new Date(isoDate)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

const fulfillmentLabel = (type: string) => (type === 'DINE_IN' ? 'Dine-in' : 'Takeaway')

const customerName = (name?: string | null) => name?.split(' ')[0] ?? 'Customer'

export default function VendorDashboardClient({ vendorName, initialOrders }: Props) {
  const [orders, setOrders] = useState<VendorOrderPayload[]>(initialOrders)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [prepInputs, setPrepInputs] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/vendor/orders/live', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to refresh queue')
      const data = await res.json()
      setOrders(data.orders)
      setError(null)
    } catch (err) {
      if (err instanceof Error) setError(err.message)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      void refresh()
    }, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  const handleAction = useCallback(async (orderId: string, action: 'CONFIRM' | 'CANCELLED' | 'SET_PREP' | 'COMPLETED') => {
    const form = new FormData()
    form.append('orderId', orderId)
    form.append('action', action)

    if (action === 'SET_PREP') {
      const minutesRaw = prepInputs[orderId]
      const minutes = minutesRaw ? Number(minutesRaw) : NaN
      if (!minutes || Number.isNaN(minutes)) {
        setError('Enter prep minutes before saving')
        return
      }
      form.append('prepMinutes', String(minutes))
    }

    const key = `${orderId}:${action}`
    setActionKey(key)
    try {
      const res = await fetch('/api/vendor/orders', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Failed to update order')
      if (action === 'SET_PREP') {
        setPrepInputs((prev) => ({ ...prev, [orderId]: '' }))
      }
      await refresh()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Order update failed')
      }
    } finally {
      setActionKey(null)
    }
  }, [prepInputs, refresh])

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'PENDING'), [orders])
  const confirmedOrders = useMemo(() => orders.filter((o) => o.status === 'CONFIRMED'), [orders])
  const queueState = pendingOrders.length ? `${pendingOrders.length} awaiting action` : 'Queue is clear'

  const isLoading = (orderId: string, action: string) => actionKey === `${orderId}:${action}`

  return (
    <div className="space-y-8 text-[rgb(var(--text))]">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Vendor queue</p>
        <h1 className="text-3xl font-semibold">Manage live orders for {vendorName ?? 'your kitchen'}.</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">Left column lists fresh orders with full details. Confirmed tickets hop over to the right so you can mark them completed.</p>
        {error && <p className="text-sm text-amber-400">{error}</p>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-5 border border-[rgb(var(--border))] bg-[rgb(var(--surface))]/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Incoming orders</h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">{queueState}</p>
            </div>
            <Badge variant={pendingOrders.length ? 'warning' : 'success'}>
              {pendingOrders.length ? `${pendingOrders.length} waiting` : 'All clear'}
            </Badge>
          </div>
          <div className="space-y-4">
            {pendingOrders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-8 text-center text-sm text-[rgb(var(--text-muted))]">
                No new orders yet. Keep notifications on—WhatsApp will buzz when students pay.
              </div>
            )}
            {pendingOrders.map((order) => (
              <Card key={order.id} className="space-y-4 border border-[rgb(var(--accent))]/30 bg-[rgb(var(--surface-muted))]/30">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">{order.canteen.name}</p>
                    <p className="mt-1 text-xl font-semibold">Order {order.id.slice(-6).toUpperCase()}</p>
                    <p className="text-sm text-[rgb(var(--text-muted))]">Placed {formatRelativeTime(order.createdAt)} • {customerName(order.user?.name)}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                    <p className="mt-2 text-lg font-semibold">{formatCurrency(order.totalCents)}</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">{fulfillmentLabel(order.fulfillmentType)}</p>
                  </div>
                </div>
                <ul className="divide-y divide-[rgb(var(--border))] rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]/40 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between px-3 py-2">
                      <span>{item.menuItem?.name ?? 'Menu item'} × {item.quantity}</span>
                      <span className="font-medium">₹{((item.priceCents * item.quantity) / 100).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" loading={isLoading(order.id, 'CONFIRM')} onClick={() => void handleAction(order.id, 'CONFIRM')}>Confirm</Button>
                  <Button type="button" variant="outline" loading={isLoading(order.id, 'CANCELLED')} onClick={() => void handleAction(order.id, 'CANCELLED')}>Cancel</Button>
                  <label className="sr-only" htmlFor={`prep-${order.id}`}>Prep minutes</label>
                  <input
                    id={`prep-${order.id}`}
                    value={prepInputs[order.id] ?? ''}
                    onChange={(e) => setPrepInputs((prev) => ({ ...prev, [order.id]: e.target.value }))}
                    type="number"
                    min={5}
                    step={5}
                    placeholder="Prep min"
                    className="input w-24"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    loading={isLoading(order.id, 'SET_PREP')}
                    onClick={() => void handleAction(order.id, 'SET_PREP')}
                  >
                    Set Prep
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Confirmed tickets</h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">Move to completed once handed off.</p>
            </div>
            <Badge variant={confirmedOrders.length ? 'info' : 'success'}>
              {confirmedOrders.length ? `${confirmedOrders.length} active` : 'None in prep'}
            </Badge>
          </div>
          <div className="space-y-3">
            {confirmedOrders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-6 text-center text-sm text-[rgb(var(--text-muted))]">
                Confirmed orders will appear here for quick completion.
              </div>
            )}
            {confirmedOrders.map((order) => (
              <Card key={order.id} className="flex flex-col gap-3 border border-[rgb(var(--accent))]/30 bg-[rgb(var(--surface-muted))]/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{order.canteen.name}</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">#{order.id.slice(-6).toUpperCase()} • {customerName(order.user?.name)}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(order.totalCents)}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-[rgb(var(--text-muted))]">
                  <span>{order.items.length} item{order.items.length === 1 ? '' : 's'}</span>
                  <span>{fulfillmentLabel(order.fulfillmentType)}</span>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    loading={isLoading(order.id, 'COMPLETED')}
                    onClick={() => void handleAction(order.id, 'COMPLETED')}
                  >
                    Completed
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div>
          <p className="text-lg font-semibold">Need the full ledger?</p>
          <p className="text-sm text-[rgb(var(--text-muted))]">We trimmed history from this screen. Jump into the history view whenever you need audits or payouts.</p>
        </div>
        <Link href="/vendor/history" className="btn">Open order history</Link>
      </Card>
    </div>
  )
}
