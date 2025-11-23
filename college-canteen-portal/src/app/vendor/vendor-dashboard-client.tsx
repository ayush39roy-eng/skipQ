'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getTicketNumber } from '@/lib/order-ticket'
import { WeeklyScheduleEditor } from '@/components/WeeklyScheduleEditor'
import { type WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from '@/types/schedule'

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
  stats: {
    totalRevenue: number
    totalOrders: number
    popularItems: Array<{ name: string; quantity: number }>
  }
  canteens: Array<{
    id: string
    name: string
    openingTime: string | null
    closingTime: string | null
    weeklySchedule?: unknown
    autoMode: boolean
    manualIsOpen: boolean
  }>
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

const sortByNewest = (a: VendorOrderPayload, b: VendorOrderPayload) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

export default function VendorDashboardClient({ vendorName, initialOrders, stats, canteens: initialCanteens }: Props) {
  const [orders, setOrders] = useState<VendorOrderPayload[]>(initialOrders)
  const [canteenSettings, setCanteenSettings] = useState(initialCanteens)

  const [actionKey, setActionKey] = useState<string | null>(null)

  const handleSettingChange = async (canteenId: string, field: string, value: boolean | string) => {
    try {
      // Optimistic update
      const newSettings = canteenSettings.map(c =>
        c.id === canteenId ? { ...c, [field]: value } : c
      )
      setCanteenSettings(newSettings)

      const targetCanteen = newSettings.find(c => c.id === canteenId)
      if (!targetCanteen) return

      const res = await fetch('/api/vendor/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canteenId,
          openingTime: targetCanteen.openingTime,
          closingTime: targetCanteen.closingTime,
          weeklySchedule: targetCanteen.weeklySchedule,
          autoMode: targetCanteen.autoMode,
          manualIsOpen: targetCanteen.manualIsOpen
        })
      })

      if (!res.ok) throw new Error('Failed to save settings')
    } catch {
      setError('Failed to save settings')
    }
  }

  const handleWeeklyScheduleSave = async (canteenId: string, schedule: WeeklySchedule) => {
    try {
      // Optimistic update
      const newSettings = canteenSettings.map(c =>
        c.id === canteenId ? { ...c, weeklySchedule: schedule } : c
      )
      setCanteenSettings(newSettings)

      const res = await fetch('/api/vendor/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canteenId,
          weeklySchedule: schedule
        })
      })

      if (!res.ok) throw new Error('Failed to save schedule')
    } catch {
      setError('Failed to save schedule')
    }
  }

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

  const incomingOrders = useMemo(
    () => orders.filter((o) => o.status === 'PAID' || o.status === 'PENDING').sort(sortByNewest),
    [orders]
  )
  const confirmedOrders = useMemo(
    () => orders.filter((o) => o.status === 'CONFIRMED').sort(sortByNewest),
    [orders]
  )
  const queueState = incomingOrders.length ? `${incomingOrders.length} awaiting action` : 'Queue is clear'

  const isLoading = (orderId: string, action: string) => actionKey === `${orderId}:${action}`


  return (
    <div className="space-y-8 text-[rgb(var(--text))]">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Vendor queue</p>
        <h1 className="text-3xl font-semibold">Manage live orders for {vendorName ?? 'your kitchen'}.</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">Left column lists fresh orders with full details. Confirmed tickets hop over to the right so you can mark them completed.</p>
        {error && <p className="text-sm text-amber-400">{error}</p>}
      </header>

      {/* Canteen Settings Section */}
      {
        canteenSettings.length > 0 && (
          <section className="space-y-6">
            {canteenSettings.map(canteen => {
              // Parse weekly schedule from JSON
              let weeklySchedule: WeeklySchedule
              try {
                if (canteen.weeklySchedule) {
                  weeklySchedule = typeof canteen.weeklySchedule === 'string'
                    ? JSON.parse(canteen.weeklySchedule)
                    : canteen.weeklySchedule as WeeklySchedule
                } else {
                  weeklySchedule = DEFAULT_WEEKLY_SCHEDULE
                }
              } catch {
                weeklySchedule = DEFAULT_WEEKLY_SCHEDULE
              }

              return (
                <div key={canteen.id} className="space-y-4">
                  <Card className="border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold">{canteen.name} Status</h3>
                      <Badge variant={canteen.autoMode ? 'info' : (canteen.manualIsOpen ? 'success' : 'danger')}>
                        {canteen.autoMode ? 'Auto' : (canteen.manualIsOpen ? 'Open' : 'Closed')}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-[rgb(var(--text-muted))]">Mode</label>
                        <div className="flex items-center gap-2 rounded-lg bg-[rgb(var(--surface-muted))] p-1">
                          <button
                            onClick={() => handleSettingChange(canteen.id, 'autoMode', true)}
                            className={`rounded-md px-3 py-1 text-xs font-medium transition ${canteen.autoMode ? 'bg-[rgb(var(--accent))] text-white' : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'}`}
                          >
                            Auto
                          </button>
                          <button
                            onClick={() => handleSettingChange(canteen.id, 'autoMode', false)}
                            className={`rounded-md px-3 py-1 text-xs font-medium transition ${!canteen.autoMode ? 'bg-[rgb(var(--accent))] text-white' : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'}`}
                          >
                            Manual
                          </button>
                        </div>
                      </div>

                      {!canteen.autoMode && (
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-[rgb(var(--text-muted))]">Manual Override</label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSettingChange(canteen.id, 'manualIsOpen', true)}
                              className={`rounded-md border px-3 py-1 text-xs font-medium transition ${canteen.manualIsOpen ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-[rgb(var(--border))] text-[rgb(var(--text-muted))]'}`}
                            >
                              Open
                            </button>
                            <button
                              onClick={() => handleSettingChange(canteen.id, 'manualIsOpen', false)}
                              className={`rounded-md border px-3 py-1 text-xs font-medium transition ${!canteen.manualIsOpen ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-[rgb(var(--border))] text-[rgb(var(--text-muted))]'}`}
                            >
                              Closed
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {canteen.autoMode && (
                    <WeeklyScheduleEditor
                      canteenName={canteen.name}
                      initialSchedule={weeklySchedule}
                      onSave={(schedule) => handleWeeklyScheduleSave(canteen.id, schedule)}
                    />
                  )}
                </div>
              )
            })}
          </section>
        )
      }

      {/* Insights Section */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Payout</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-[rgb(var(--text-muted))]">After SkipQ commission</p>
        </Card>
        <Card className="border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Orders</p>
          <p className="mt-2 text-2xl font-semibold">{stats.totalOrders}</p>
          <p className="text-xs text-[rgb(var(--text-muted))]">Total served</p>
        </Card>
        <Card className="border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Top Items</p>
          <ul className="mt-2 space-y-1 text-sm">
            {stats.popularItems.length > 0 ? (
              stats.popularItems.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span className="truncate">{item.name}</span>
                  <span className="font-medium text-[rgb(var(--text-muted))]">{item.quantity}</span>
                </li>
              ))
            ) : (
              <li className="text-[rgb(var(--text-muted))]">No data yet</li>
            )}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-5 border border-[rgb(var(--border))] bg-[rgb(var(--surface))]/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Incoming orders</h2>
              <p className="text-sm text-[rgb(var(--text-muted))]">{queueState}</p>
            </div>
            <Badge variant={incomingOrders.length ? 'warning' : 'success'}>
              {incomingOrders.length ? `${incomingOrders.length} waiting` : 'All clear'}
            </Badge>
          </div>
          <div className="space-y-4">
            {incomingOrders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-8 text-center text-sm text-[rgb(var(--text-muted))]">
                No new orders yet. Keep notifications on—WhatsApp will buzz when students pay.
              </div>
            )}
            {incomingOrders.map((order) => (
              <Card key={order.id} className="space-y-4 border border-[rgb(var(--accent))]/30 bg-[rgb(var(--surface-muted))]/30">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">{order.canteen.name}</p>
                    <p className="mt-1 text-xl font-semibold">Ticket #{getTicketNumber(order.id)}</p>
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
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button type="button" className="w-full sm:w-auto" loading={isLoading(order.id, 'CONFIRM')} onClick={() => void handleAction(order.id, 'CONFIRM')}>Confirm</Button>
                  <Button type="button" variant="outline" className="w-full sm:w-auto" loading={isLoading(order.id, 'CANCELLED')} onClick={() => void handleAction(order.id, 'CANCELLED')}>Cancel</Button>
                  <label className="sr-only" htmlFor={`prep-${order.id}`}>Prep minutes</label>
                  <input
                    id={`prep-${order.id}`}
                    value={prepInputs[order.id] ?? ''}
                    onChange={(e) => setPrepInputs((prev) => ({ ...prev, [order.id]: e.target.value }))}
                    type="number"
                    min={5}
                    step={5}
                    placeholder="Prep min"
                    className="input w-full sm:w-24"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    loading={isLoading(order.id, 'SET_PREP')}
                    onClick={() => void handleAction(order.id, 'SET_PREP')}
                    className="w-full sm:w-auto"
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
              <Card key={order.id} className="space-y-3 border border-[rgb(var(--accent))]/30 bg-[rgb(var(--surface-muted))]/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{order.canteen.name}</p>
                    <p className="text-xs text-[rgb(var(--text-muted))]">Ticket #{getTicketNumber(order.id)} • {customerName(order.user?.name)}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                    <p className="text-sm font-semibold">{formatCurrency(order.totalCents)}</p>
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
                <div className="flex items-center justify-between text-xs text-[rgb(var(--text-muted))]">
                  <span>{fulfillmentLabel(order.fulfillmentType)}</span>
                  <span>Placed {formatRelativeTime(order.createdAt)}</span>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    loading={isLoading(order.id, 'COMPLETED')}
                    onClick={() => void handleAction(order.id, 'COMPLETED')}
                    className="w-full sm:w-auto"
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
    </div >
  )
}
