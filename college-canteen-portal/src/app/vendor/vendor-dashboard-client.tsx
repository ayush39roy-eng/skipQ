'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getTicketNumber } from '@/lib/order-ticket'
import { WeeklyScheduleEditor } from '@/components/WeeklyScheduleEditor'
import { type WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from '@/types/schedule'

declare global {
  interface Window {
    __prep_timer_interval?: number
  }
}

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
  prepExtended?: boolean
  cookingInstructions?: string | null
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
    menuItems: Array<{
      id: string
      name: string
      available: boolean
      priceCents: number
      sectionName: string
    }>
  }>
}

const statusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'CONFIRMED':
    case 'READY':
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

  // Audio & notification helpers
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastNotifiedRef = useRef<string | null>(null)
  const audioUnlockedRef = useRef(false)

  const [actionKey, setActionKey] = useState<string | null>(null)

  const handleSettingChange = async (canteenId: string, field: string, value: boolean | string) => {
    if (savingSettings === canteenId) return
    try {
      setSavingSettings(canteenId)
      // Optimistic update
      const previousSettings = canteenSettings
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

      if (!res.ok) {
        setCanteenSettings(previousSettings)
        throw new Error('Failed to save settings')
      }
    } catch (err) {
      // Rollback and surface error
      setCanteenSettings((prev) => prev)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSavingSettings(null)
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
  const [savingSettings, setSavingSettings] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/vendor/orders/live', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to refresh queue')
      const data = await res.json()
      // Detect new order and notify
      const incoming = Array.isArray(data.orders) ? data.orders : []
      // find newest order by createdAt
      let newest: VendorOrderPayload | null = null
      for (const o of incoming) {
        if (!newest || new Date(o.createdAt).getTime() > new Date(newest.createdAt).getTime()) newest = o
      }
      if (newest && newest.id !== lastNotifiedRef.current) {
        // Avoid notifying for the initial load; lastNotifiedRef is initialized on mount
        // Notify only when this is a truly new order
        try {
          // Play beep using WebAudio
          if (!audioCtxRef.current) {
            // Some browsers expose webkitAudioContext on window; guard with a typed check
            type AudioWindow = Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
            const w = globalThis as unknown as AudioWindow
            const Ctor = w.AudioContext ?? w.webkitAudioContext
            if (Ctor) audioCtxRef.current = new Ctor()
          }
          const ctx = audioCtxRef.current
          if (ctx) {
            const o = ctx.createOscillator()
            const g = ctx.createGain()
            o.type = 'sine'
            o.frequency.value = 880
            g.gain.value = 0.0001
            o.connect(g)
            g.connect(ctx.destination)
            // ramp gain to avoid click
            g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02)
            o.start()
            o.stop(ctx.currentTime + 0.25)
            // gentle release
            g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25)
          }
        } catch {
          // fallback: try Audio constructor (some browsers block AudioContext until interaction)
          try { new Audio('/sounds/new-order.mp3').play().catch(() => { }) } catch { }
        }

        // Browser notification
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const title = `New order — Ticket #${getTicketNumber(newest.id)}`
            const body = `${(newest.totalCents / 100).toFixed(2)} • ${newest.canteen.name}`
            // Keep notification visible until user interacts where supported
            // @ts-expect-error: some TS DOM libs don't include `requireInteraction` in NotificationOptions
            const notif = new Notification(title, { body, tag: `order-${newest.id}`, requireInteraction: true, vibrate: [200, 100, 200] })
            try {
              notif.onclick = () => {
                try { window.focus() } catch { }
                try { notif.close() } catch { }
              }
            } catch { }
          }
        } catch {
          // ignore notification errors
        }

        lastNotifiedRef.current = newest.id
      }

      setOrders(incoming)
      setError(null)
    } catch (err) {
      if (err instanceof Error) setError(err.message)
    }
  }, [])

  useEffect(() => {
    // Unlock audio on first user gesture (required on iOS/Safari/iPadOS)
    const tryUnlockAudio = () => {
      if (audioUnlockedRef.current) return
      audioUnlockedRef.current = true
      try {
        type AudioWindow = Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
        const w = globalThis as unknown as AudioWindow
        const Ctor = w.AudioContext ?? w.webkitAudioContext
        if (Ctor && !audioCtxRef.current) {
          try {
            audioCtxRef.current = new Ctor()
          } catch { }
        }
        try {
          audioCtxRef.current?.resume().catch(() => { })
        } catch { }

        // Try a silent play to prime the audio stack (some Safari versions need an actual element play)
        try {
          const priming = new Audio('/sounds/new-order.mp3')
          priming.volume = 0
          void priming.play().then(() => {
            try { priming.pause(); priming.currentTime = 0 } catch { }
          }).catch(() => { })
        } catch { }
      } finally {
        // remove listeners after first attempt
        window.removeEventListener('click', tryUnlockAudio)
        window.removeEventListener('touchstart', tryUnlockAudio)
      }
    }

    window.addEventListener('click', tryUnlockAudio, { passive: true })
    window.addEventListener('touchstart', tryUnlockAudio, { passive: true })
    // initialize last-notified id so initial load doesn't trigger alert
    try {
      if (Array.isArray(initialOrders) && initialOrders.length > 0) {
        let newest: VendorOrderPayload | null = null
        for (const o of initialOrders) {
          if (!newest || new Date(o.createdAt).getTime() > new Date(newest.createdAt).getTime()) newest = o
        }
        if (newest) lastNotifiedRef.current = newest.id
      }
    } catch { }

    // request notification permission (non-blocking)
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => { })
    } catch { }

    const interval = setInterval(() => {
      void refresh()
    }, 5000)
    return () => clearInterval(interval)
  }, [refresh, initialOrders])

  const handleAction = useCallback(async (orderId: string, action: 'CONFIRM' | 'CANCELLED' | 'SET_PREP' | 'COMPLETED' | 'EXTEND_PREP' | 'READY') => {
    const form = new FormData()
    form.append('orderId', orderId)
    form.append('action', action)

    // For SET_PREP we require a valid minutes value; for CONFIRM we'll include prepMinutes if available
    if (action === 'SET_PREP' || action === 'CONFIRM') {
      const minutesRaw = prepInputs[orderId]
      let minutes = minutesRaw ? Number(minutesRaw) : NaN
      const o = orders.find((x) => x.id === orderId)
      if (Number.isNaN(minutes)) {
        // fallback to current order value if present
        if (o && typeof o.prepMinutes === 'number') minutes = o.prepMinutes
      }

      // For CONFIRM we always want to persist a prepMinutes so the user sees it.
      if (action === 'CONFIRM') {
        if (Number.isNaN(minutes) || !minutes) {
          minutes = o && typeof o.prepMinutes === 'number' ? o.prepMinutes : 5
        }
        form.append('prepMinutes', String(minutes))
      } else if (action === 'SET_PREP') {
        if (!minutes || Number.isNaN(minutes)) {
          setError('Enter prep minutes before saving')
          return
        }
        form.append('prepMinutes', String(minutes))
      }
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
  }, [prepInputs, refresh, orders])

  const incomingOrders = useMemo(
    () => orders.filter((o) => o.status === 'PAID' || o.status === 'PENDING').sort(sortByNewest),
    [orders]
  )
  const confirmedOrders = useMemo(
    // Show oldest confirmed orders on top
    () => orders
      .filter((o) => o.status === 'CONFIRMED' || o.status === 'READY')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [orders]
  )
  const queueState = incomingOrders.length ? `${incomingOrders.length} awaiting action` : 'Queue is clear'

  const isLoading = (orderId: string, action: string) => actionKey === `${orderId}:${action}`

  function PrepTimer({ prep, updatedAt, status }: { prep: number | null | undefined; updatedAt: string; status: string }) {
    const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null)

    useEffect(() => {
      if (prep == null || !updatedAt || status !== 'CONFIRMED') {
        setRemainingMinutes(null)
        return
      }
      const start = Date.parse(updatedAt)
      const endAt = start + prep * 60_000

      const update = () => {
        const diff = endAt - Date.now()
        setRemainingMinutes(Math.max(0, Math.ceil(diff / 60000)))
      }

      update()
      // align to next minute boundary then every 60s
      const now = Date.now()
      const msToNextMinute = 60000 - (now % 60000)
      const timeoutId = window.setTimeout(() => {
        update()
        const id = window.setInterval(update, 60000)
          ; (window).__prep_timer_interval = id
      }, msToNextMinute)

      return () => {
        clearTimeout(timeoutId as unknown as number)
        const id = window.__prep_timer_interval
        if (id) clearInterval(id)
      }
    }, [prep, updatedAt, status])

    if (prep == null || remainingMinutes == null) return null
    const start = updatedAt ? Date.parse(updatedAt) : Date.now()
    const endAt = start + (prep ?? 0) * 60_000
    return (
      <div className="text-sm text-[rgb(var(--text-muted))] mt-2">
        <div>Prep time: <span className="font-medium">{prep} min</span></div>
        <div className="text-xs mt-1">Approx ready at <span className="font-medium">{new Date(endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> — <span className="font-medium">{remainingMinutes > 0 ? `${remainingMinutes} min` : 'Ready'}</span></div>
      </div>
    )
  }


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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Decrease prep minutes"
                      onClick={() => {
                        setPrepInputs((prev) => {
                          const cur = Number(prev[order.id]) || (order.prepMinutes ?? 5)
                          const next = Math.max(5, cur - 5)
                          return { ...prev, [order.id]: String(next) }
                        })
                      }}
                      className="rounded-md border px-3 py-1 text-sm font-medium"
                    >
                      –
                    </button>

                    <div className="w-20 text-center font-medium">
                      {(Number(prepInputs[order.id]) || order.prepMinutes || 5) + ' min'}
                    </div>

                    <button
                      type="button"
                      aria-label="Increase prep minutes"
                      onClick={() => {
                        setPrepInputs((prev) => {
                          const cur = Number(prev[order.id]) || (order.prepMinutes ?? 5)
                          const next = cur + 5
                          return { ...prev, [order.id]: String(next) }
                        })
                      }}
                      className="rounded-md border px-3 py-1 text-sm font-medium"
                    >
                      +
                    </button>

                    {/* Set Prep button removed — +/- will save prep after short debounce */}
                  </div>
                </div>
                {order.cookingInstructions && (
                  <div className="text-sm text-[rgb(var(--text-muted))] mt-2">Instruction: <span className="font-medium">{order.cookingInstructions}</span></div>
                )}
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
                <PrepTimer prep={order.prepMinutes ?? null} updatedAt={order.updatedAt} status={order.status} />
                {order.cookingInstructions && (
                  <div className="text-sm text-[rgb(var(--text-muted))] mt-2">Instruction: <span className="font-medium">{order.cookingInstructions}</span></div>
                )}
                <div className="flex items-center justify-between text-xs text-[rgb(var(--text-muted))]">
                  <span>{fulfillmentLabel(order.fulfillmentType)}</span>
                  <span>Placed {formatRelativeTime(order.createdAt)}</span>
                </div>
                <div className="flex justify-end">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      loading={isLoading(order.id, 'EXTEND_PREP')}
                      disabled={!!order.prepExtended || order.status === 'READY'}
                      onClick={() => void handleAction(order.id, 'EXTEND_PREP')}
                      className="w-full sm:w-auto"
                    >
                      {order.prepExtended ? 'Extended' : 'Extend +5 min'}
                    </Button>

                    {order.status !== 'READY' && (
                      <Button
                        type="button"
                        loading={isLoading(order.id, 'READY')}
                        onClick={() => void handleAction(order.id, 'READY')}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Ready
                      </Button>
                    )}

                    <Button
                      type="button"
                      loading={isLoading(order.id, 'COMPLETED')}
                      onClick={() => void handleAction(order.id, 'COMPLETED')}
                      className="w-full sm:w-auto"
                    >
                      Completed
                    </Button>
                  </div>
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

      <Card className="flex flex-wrap items-center justify-between gap-4 border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div>
          <p className="text-lg font-semibold">Vendor Analytics</p>
          <p className="text-sm text-[rgb(var(--text-muted))]">View sales performance, peak hours, and payment insights.</p>
        </div>
        <Link href="/vendor/analytics" className="btn-secondary">View Analytics</Link>
      </Card>

      {/* Menu Availability Manager */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Menu Availability</h2>
        <p className="text-sm text-[rgb(var(--text-muted))]">Toggle items to mark them as unavailable. Changes save automatically.</p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {canteenSettings.map((canteen) => (
            <Card key={canteen.id} className="border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
              <h3 className="mb-3 font-semibold">{canteen.name}</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {canteen.menuItems && canteen.menuItems.length > 0 ? (
                  canteen.menuItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-[rgb(var(--text-muted))]">{item.sectionName} • {formatCurrency(item.priceCents)}</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={item.available}
                          onChange={async (e) => {
                            const newAvailable = e.target.checked
                            // Optimistic update
                            setCanteenSettings(prev => prev.map(c => {
                              if (c.id !== canteen.id) return c
                              return {
                                ...c,
                                menuItems: c.menuItems.map(i => i.id === item.id ? { ...i, available: newAvailable } : i)
                              }
                            }))

                            try {
                              const res = await fetch('/api/vendor/menu-items', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ menuItemId: item.id, available: newAvailable })
                              })
                              if (!res.ok) throw new Error('Failed to update')
                            } catch {
                              // Revert on error
                              setCanteenSettings(prev => prev.map(c => {
                                if (c.id !== canteen.id) return c
                                return {
                                  ...c,
                                  menuItems: c.menuItems.map(i => i.id === item.id ? { ...i, available: !newAvailable } : i)
                                }
                              }))
                              setError('Failed to update availability')
                            }
                          }}
                        />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"></div>
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[rgb(var(--text-muted))]">No items found.</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div >
  )
}
