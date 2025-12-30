'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
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
  const queueState = incomingOrders.length ? `${incomingOrders.length} awaiting action` : 'All clear'

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
    
    // Color coding for urgency
    const isLate = remainingMinutes <= 0
    const isSoon = remainingMinutes > 0 && remainingMinutes <= 2
    
    return (
      <div className={`text-xs font-medium mt-3 px-3 py-1.5 rounded-md flex items-center justify-between ${
        isLate ? 'bg-red-50 text-red-700 border border-red-100' : isSoon ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-[rgb(var(--vendor-bg))] text-[rgb(var(--vendor-text-secondary))] border border-[rgb(var(--vendor-border))]'
      }`}>
        <span className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {remainingMinutes > 0 ? `${remainingMinutes} min left` : 'Due now'}
        </span>
        <span className="opacity-75">{new Date(endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    )
  }


  return (
    <div className="space-y-8 pb-20">
      {/* Header with Glass Effect */}
      <header className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[rgb(var(--vendor-text-primary))]">
              Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--vendor-accent))] to-teal-500">{vendorName ?? 'Partner'}</span>
            </h1>
            <p className="text-[rgb(var(--vendor-text-secondary))] mt-1">Here&apos;s what&apos;s happening in your kitchen today.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-4 py-2 bg-[rgb(var(--vendor-surface))] border border-[rgb(var(--vendor-border))] rounded-full text-sm font-medium text-[rgb(var(--vendor-text-secondary))] shadow-sm">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
             </div>
             <Link href="/vendor/terminal">
               <Button variant="primary" className="rounded-full shadow-sm">
                  Open Terminal
               </Button>
             </Link>
             <Button variant="outline" onClick={() => void refresh()} className="rounded-full shadow-sm hover:border-[rgb(var(--vendor-accent))]">
               Refresh
             </Button>
          </div>
        </div>
        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">{error}</div>}
      </header>

      {/* Insights Section - Premium Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="relative group overflow-hidden rounded-2xl border border-[rgb(var(--vendor-border))] bg-[rgb(var(--vendor-surface))] p-6 shadow-sm transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--vendor-text-secondary))]">Total Revenue</p>
          <p className="mt-2 text-3xl font-bold text-[rgb(var(--vendor-text-primary))]">{formatCurrency(stats.totalRevenue)}</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md">
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
             <span>Today&apos;s earnings</span>
          </div>
        </div>

        <div className="relative group overflow-hidden rounded-2xl border border-[rgb(var(--vendor-border))] bg-[rgb(var(--vendor-surface))] p-6 shadow-sm transition-all hover:shadow-md">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--vendor-text-secondary))]">Orders Served</p>
          <p className="mt-2 text-3xl font-bold text-[rgb(var(--vendor-text-primary))]">{stats.totalOrders}</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[rgb(var(--vendor-text-secondary))] bg-[rgb(var(--vendor-surface-muted))] w-fit px-2 py-1 rounded-md">
             <span>Lifetime orders</span>
          </div>
        </div>

        <div className="relative group overflow-hidden rounded-2xl border border-[rgb(var(--vendor-border))] bg-[rgb(var(--vendor-surface))] p-6 shadow-sm transition-all hover:shadow-md">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--vendor-text-secondary))]">Top Item</p>
          <p className="mt-2 text-lg font-bold text-[rgb(var(--vendor-text-primary))] truncate">
             {stats.popularItems[0]?.name ?? 'None yet'}
          </p>
          <p className="text-sm font-medium text-[rgb(var(--vendor-text-secondary))]">
             {stats.popularItems[0]?.quantity ? `${stats.popularItems[0].quantity} sold` : 'Waiting for data'}
          </p>
        </div>
      </div>

      {/* Canteen Status Cards */}
      {canteenSettings.length > 0 && (
         <div className="grid gap-6 md:grid-cols-2">
            {canteenSettings.map(canteen => {
               // Schedule logic omitted for brevity, same as before
               let weeklySchedule: WeeklySchedule
               try {
                  if (canteen.weeklySchedule) {
                     weeklySchedule = typeof canteen.weeklySchedule === 'string' ? JSON.parse(canteen.weeklySchedule) : canteen.weeklySchedule
                  } else weeklySchedule = DEFAULT_WEEKLY_SCHEDULE
               } catch { weeklySchedule = DEFAULT_WEEKLY_SCHEDULE }

               return (
                  <div key={canteen.id} className="rounded-2xl border border-[var(--vendor-border)] bg-[var(--vendor-surface)] p-6 shadow-sm">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <div className={`h-3 w-3 rounded-full ${canteen.manualIsOpen ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
                           <h3 className="font-bold text-lg text-[var(--vendor-text-primary)]">{canteen.name}</h3>
                        </div>
                        <Badge variant={canteen.autoMode ? 'info' : 'default'} className="uppercase tracking-wider text-[10px]">
                           {canteen.autoMode ? 'Auto Schedule' : 'Manual Mode'}
                        </Badge>
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--vendor-bg)] border border-[var(--vendor-border)]">
                           <label className="text-sm font-medium text-[var(--vendor-text-secondary)]">Operation Mode</label>
                           <div className="flex bg-[var(--vendor-surface)] rounded-lg p-1 border border-[var(--vendor-border)]">
                              <button
                                 onClick={() => handleSettingChange(canteen.id, 'autoMode', true)}
                                 className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${canteen.autoMode ? 'bg-[var(--vendor-text-primary)] text-[var(--vendor-bg)] shadow-sm' : 'text-[var(--vendor-text-secondary)] hover:text-[var(--vendor-text-primary)]'}`}
                              >
                                 Auto
                              </button>
                              <button
                                 onClick={() => handleSettingChange(canteen.id, 'autoMode', false)}
                                 className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!canteen.autoMode ? 'bg-[var(--vendor-text-primary)] text-[var(--vendor-bg)] shadow-sm' : 'text-[var(--vendor-text-secondary)] hover:text-[var(--vendor-text-primary)]'}`}
                              >
                                 Manual
                              </button>
                           </div>
                        </div>

                        {!canteen.autoMode && (
                           <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--vendor-bg)] border border-[var(--vendor-border)]">
                              <label className="text-sm font-medium text-[var(--vendor-text-secondary)]">Status Override</label>
                              <div className="flex gap-2">
                                 <button
                                    onClick={() => handleSettingChange(canteen.id, 'manualIsOpen', true)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all border ${canteen.manualIsOpen ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                 >
                                    Open
                                 </button>
                                 <button
                                    onClick={() => handleSettingChange(canteen.id, 'manualIsOpen', false)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all border ${!canteen.manualIsOpen ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                 >
                                    Close
                                 </button>
                              </div>
                           </div>
                        )}
                        
                        {canteen.autoMode && (
                           <div className="pt-2">
                             <WeeklyScheduleEditor
                               canteenName={canteen.name}
                               initialSchedule={weeklySchedule}
                               onSave={(schedule) => handleWeeklyScheduleSave(canteen.id, schedule)}
                             />
                           </div>
                        )}
                     </div>
                  </div>
               )
            })}
         </div>
      )}

      {/* Main Order Queue - 2 Columns */}
      <div className="grid gap-8 lg:grid-cols-[1.8fr_1.2fr]">
        
        {/* Left Column: Incoming */}
        <div className="space-y-5">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                 Incoming Orders
                 {incomingOrders.length > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-pulse">{incomingOrders.length}</span>}
              </h2>
              <span className="text-xs font-medium text-[var(--vendor-text-secondary)] tracking-wide uppercase">{queueState}</span>
           </div>

           <div className="space-y-4">
            {incomingOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[var(--vendor-border)] bg-[var(--vendor-bg)]/50 p-12 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <h3 className="text-slate-900 font-semibold mb-1">Queue is empty</h3>
                <p className="text-slate-500 text-sm max-w-xs">New orders will pop up here with a sound alert.</p>
              </div>
            )}
            
            {incomingOrders.map((order) => (
              <div key={order.id} className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--vendor-border))] bg-[rgb(var(--vendor-surface))] shadow-sm transition-all hover:shadow-md hover:border-[rgb(var(--vendor-accent-muted))]">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[rgb(var(--vendor-accent))] to-teal-500"></div>
                <div className="p-5">
                   {/* Header of Card */}
                   <div className="flex items-start justify-between mb-4">
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--vendor-accent-dark))] bg-[rgb(var(--vendor-accent-muted))] px-2 py-0.5 rounded-full">{order.canteen.name}</span>
                            <span className="text-xs text-[rgb(var(--vendor-text-secondary))]">• {formatRelativeTime(order.createdAt)}</span>
                         </div>
                         <h3 className="text-lg font-bold text-[rgb(var(--vendor-text-primary))]">
                           {customerName(order.user?.name)} 
                           <span className="text-[rgb(var(--vendor-text-secondary))] font-normal mx-1">Order</span> 
                           #{getTicketNumber(order.id)}
                         </h3>
                      </div>
                      <div className="text-right">
                         <div className="text-xl font-bold text-[rgb(var(--vendor-text-primary))]">{formatCurrency(order.totalCents)}</div>
                         <div className="text-xs font-medium text-[rgb(var(--vendor-text-secondary))] uppercase tracking-wide">{fulfillmentLabel(order.fulfillmentType)}</div>
                      </div>
                   </div>

                   {/* Items List */}
                   <div className="bg-[rgb(var(--vendor-bg))] rounded-xl p-3 mb-5 border border-[rgb(var(--vendor-border))] space-y-2">
                     {order.items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between text-sm">
                           <div className="flex items-start gap-2">
                              <span className="font-bold text-[rgb(var(--vendor-text-primary))] h-5 w-5 flex items-center justify-center bg-[rgb(var(--vendor-surface))] rounded border border-[rgb(var(--vendor-border))] text-xs shadow-sm">
                                {item.quantity}
                              </span>
                              <span className="text-[rgb(var(--vendor-text-primary))] font-medium">{item.menuItem?.name ?? 'Unknown Item'}</span>
                           </div>
                           <span className="text-[rgb(var(--vendor-text-secondary))]">₹{((item.priceCents * item.quantity)/100).toFixed(2)}</span>
                        </div>
                     ))}
                   </div>

                   {order.cookingInstructions && (
                     <div className="mb-4 text-sm bg-orange-50 text-orange-800 px-3 py-2 rounded-lg border border-orange-100 flex gap-2 items-start">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="italic">&quot;{order.cookingInstructions}&quot;</span>
                     </div>
                   )}

                   {/* Actions */}
                   <div className="flex flex-wrap items-center gap-3">
                      <Button 
                         variant="primary"
                         loading={isLoading(order.id, 'CONFIRM')} 
                         onClick={() => void handleAction(order.id, 'CONFIRM')}
                         className="flex-1 py-6 rounded-xl"
                      >
                         Accept Order
                      </Button>
                      <Button 
                         variant="secondary"
                         loading={isLoading(order.id, 'CANCELLED')} 
                         onClick={() => void handleAction(order.id, 'CANCELLED')}
                         className="flex-shrink-0 border-[rgb(var(--vendor-border))] hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl py-6 px-4"
                      >
                         Reject
                      </Button>
                      
                      {/* Prep Time Adjuster */}
                      <div className="flex items-center bg-[rgb(var(--vendor-surface))] border border-[rgb(var(--vendor-border))] rounded-xl p-1 shadow-sm">
                         <button 
                           onClick={() => setPrepInputs(prev => ({...prev, [order.id]: String(Math.max(5, (Number(prev[order.id]) || (order.prepMinutes || 5)) - 5)) }))}
                           className="w-8 h-8 flex items-center justify-center hover:bg-[rgb(var(--vendor-bg))] rounded-lg text-[rgb(var(--vendor-text-secondary))]"
                         >-</button>
                         <span className="w-12 text-center text-sm font-bold text-[rgb(var(--vendor-text-primary))]">{(Number(prepInputs[order.id]) || order.prepMinutes || 5)}m</span>
                         <button 
                           onClick={() => setPrepInputs(prev => ({...prev, [order.id]: String((Number(prev[order.id]) || (order.prepMinutes || 5)) + 5) }))}
                           className="w-8 h-8 flex items-center justify-center hover:bg-[rgb(var(--vendor-bg))] rounded-lg text-[rgb(var(--vendor-text-secondary))]"
                         >+</button>
                      </div>
                   </div>
                </div>
              </div>
            ))}
           </div>
        </div>

        {/* Right Column: In Progress/Ready */}
        <div className="space-y-5">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">In Kitchen / Ready</h2>
              <Badge variant="default" className="bg-white">{confirmedOrders.length}</Badge>
           </div>
           
           <div className="space-y-3">
            {confirmedOrders.length === 0 && (
               <div className="rounded-3xl border border-[var(--vendor-border)] bg-[var(--vendor-surface)] p-8 text-center">
                  <p className="text-slate-400 font-medium">No active orders</p>
               </div>
            )}
            
            {confirmedOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-[rgb(var(--vendor-border))] bg-[rgb(var(--vendor-surface))] p-4 shadow-sm relative overflow-hidden">
                 {order.status === 'READY' && <div className="absolute top-0 right-0 w-20 h-20 bg-[rgb(var(--vendor-accent-muted))] rounded-bl-full pointer-events-none"></div>}
                 
                 <div className="flex justify-between items-start mb-3">
                    <div>
                       <div className="font-bold text-[rgb(var(--vendor-text-primary))] text-lg">#{getTicketNumber(order.id)}</div>
                       <div className="text-xs text-[rgb(var(--vendor-text-secondary))]">{order.canteen.name} • {fulfillmentLabel(order.fulfillmentType)}</div>
                    </div>
                    <Badge variant={statusVariant(order.status)} className="rounded-md">{order.status}</Badge>
                 </div>

                 <div className="border-t border-b border-[rgb(var(--vendor-border))] py-3 my-3 space-y-1">
                    {order.items.map((item) => (
                       <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-[rgb(var(--vendor-text-secondary))]"><span className="font-bold text-[rgb(var(--vendor-text-primary))]">{item.quantity}x</span> {item.menuItem?.name}</span>
                       </div>
                    ))}
                 </div>

                 <PrepTimer prep={order.prepMinutes ?? null} updatedAt={order.updatedAt} status={order.status} />

                 <div className="mt-4 flex gap-2">
                    {order.status !== 'READY' && (
                       <Button 
                          variant="primary"
                          onClick={() => void handleAction(order.id, 'READY')}
                          loading={isLoading(order.id, 'READY')}
                          className="flex-1 shadow-sm"
                        >
                          Mark Ready
                        </Button>
                    )}
                    <Button 
                       onClick={() => void handleAction(order.id, 'COMPLETED')}
                       loading={isLoading(order.id, 'COMPLETED')}
                       variant={order.status === 'READY' ? 'primary' : 'secondary'}
                       className="flex-1"
                    >
                       Done
                    </Button>
                    <Button
                       onClick={() => void handleAction(order.id, 'EXTEND_PREP')}
                       loading={isLoading(order.id, 'EXTEND_PREP')}
                       disabled={!!order.prepExtended || order.status === 'READY'}
                       variant="outline"
                       className="px-2 border-[rgb(var(--vendor-border))]"
                       title="Extend prep 5m"
                    >
                       +5
                    </Button>
                 </div>
              </div>
            ))}
           </div>
        </div>

      </div>

      {/* Menu Manager */}
      <section className="pt-10 border-t border-[var(--vendor-border)]">
        <div className="flex items-center justify-between mb-6">
           <div>
              <h2 className="text-xl font-bold">Quick Menu</h2>
              <p className="text-sm text-slate-500">Toggle item availability instantly.</p>
           </div>
           <Link href="/vendor/menu" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Full Menu Manager <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
           </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {canteenSettings.map((canteen) => (
             <div key={canteen.id} className="rounded-2xl border border-[var(--vendor-border)] bg-[var(--vendor-surface)] overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-[var(--vendor-border)] font-bold text-slate-700 dark:text-slate-200">
                   {canteen.name}
                </div>
                <div className="p-2 max-h-80 overflow-y-auto space-y-1 scrollbar-thin">
                   {canteen.menuItems && canteen.menuItems.length > 0 ? (
                      canteen.menuItems.map((item) => (
                         <div key={item.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group">
                            <div className="flex-1 min-w-0 pr-3">
                               <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                               <p className="text-xs text-slate-400 truncate">{item.sectionName} • {formatCurrency(item.priceCents)}</p>
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
                                       return { ...c, menuItems: c.menuItems.map(i => i.id === item.id ? { ...i, available: newAvailable } : i) }
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
                                          return { ...c, menuItems: c.menuItems.map(i => i.id === item.id ? { ...i, available: !newAvailable } : i) }
                                       }))
                                       setError('Failed to update availability')
                                    }
                                 }}
                               />
                               <div className="peer h-5 w-9 rounded-full bg-slate-200 dark:bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-focus:outline-none focus:ring-2 focus:ring-emerald-500/20"></div>
                            </label>
                         </div>
                      ))
                   ) : <div className="p-4 text-center text-sm text-slate-400">No items</div>}
                </div>
             </div>
          ))}
        </div>
      </section>
    </div>
  )
}
