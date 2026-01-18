'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { getTicketNumber } from '@/lib/order-ticket'
import { WeeklyScheduleEditor } from '@/components/WeeklyScheduleEditor'
import { type WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from '@/types/schedule'
import { 
  Bell, 
  ChefHat, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  LayoutDashboard, 
  Settings, 
  Store, 
  Menu as MenuIcon,
  ShoppingBag,
  TrendingUp,
  X,
  RefreshCw,
  LogOut,
  Volume2
} from 'lucide-react'

// --- Visual Components (Local to avoid Game Theme pollution) ---

function VendorCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function VendorButton({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  className = '', 
  disabled = false, 
  loading = false,
  title
}: { 
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  loading?: boolean
  title?: string
}) {
  const base = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  }
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-300 shadow-sm",
    outline: "border border-slate-200 text-slate-600 hover:bg-slate-50 focus:ring-slate-300",
    ghost: "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500"
  }

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} title={title}>
      {loading && <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}

function VendorBadge({ 
  children, 
  variant = 'default',
  className = '' 
}: { 
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral'
  className?: string 
}) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    danger: "bg-rose-50 text-rose-700 border border-rose-100",
    neutral: "bg-gray-50 text-gray-600 border border-gray-100"
  }
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// --- Logic ---

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

const formatCurrency = (cents: number) => `₹${(cents / 100).toFixed(2)}`

const formatTimeAgo = (isoDate: string) => {
  const diffMinutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  return `${Math.floor(diffMinutes / 60)}h ago`
}

export default function VendorDashboardClient({ vendorName, initialOrders, stats, canteens: initialCanteens }: Props) {
  const [orders, setOrders] = useState<VendorOrderPayload[]>(initialOrders)
  const [canteenSettings, setCanteenSettings] = useState(initialCanteens)
  const [prepInputs, setPrepInputs] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [savingSettings, setSavingSettings] = useState<string | null>(null)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [scheduleEditorCanteenId, setScheduleEditorCanteenId] = useState<string | null>(null)

  // Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastNotifiedRef = useRef<string | null>(null)
  const audioUnlockedRef = useRef(false)

  // Refresh Queues
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true)
    try {
      const res = await fetch('/api/vendor/orders/live', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to refresh')
      const data = await res.json()
      const incoming = Array.isArray(data.orders) ? data.orders : []
      
      // Notify check
      let newest = incoming.sort((a: VendorOrderPayload, b: VendorOrderPayload) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      if (newest && newest.id !== lastNotifiedRef.current) {
         playNotificationSound()
         lastNotifiedRef.current = newest.id
      }

      setOrders(incoming)
      setError(null)
    } catch (err) {
      if (!silent && err instanceof Error) setError(err.message)
    } finally {
      if (!silent) setIsRefreshing(false)
    }
  }, [])

  // Poll
  useEffect(() => {
    const interval = setInterval(() => refresh(true), 5000)
    return () => clearInterval(interval)
  }, [refresh])

  // Initial Notify Ref
  useEffect(() => {
     if (initialOrders.length > 0) {
        // Don't notify for pre-existing orders on load
        const newest = initialOrders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        if (newest) lastNotifiedRef.current = newest.id
     }
  }, [initialOrders])

  const playNotificationSound = () => {
    try {
        const audio = new Audio('/sounds/new-order.mp3')
        audio.play().catch(() => {/* ignore auto-play policies */})
    } catch {}
  }

  // --- Actions ---

  const handleAction = useCallback(async (orderId: string, action: 'CONFIRM' | 'CANCELLED' | 'SET_PREP' | 'COMPLETED' | 'EXTEND_PREP' | 'READY') => {
    const form = new FormData()
    form.append('orderId', orderId)
    form.append('action', action)

    if (action === 'CONFIRM' || action === 'SET_PREP') {
      const order = orders.find(o => o.id === orderId)
      let minutes = Number(prepInputs[orderId])
      if (isNaN(minutes) || !minutes) minutes = (order?.prepMinutes ?? 5)
      form.append('prepMinutes', String(minutes))
    }

    const key = `${orderId}:${action}`
    setActionKey(key)
    try {
      const res = await fetch('/api/vendor/orders', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Action failed')
      if (action === 'SET_PREP') setPrepInputs(prev => ({ ...prev, [orderId]: '' }))
      await refresh(true)
    } catch (err) {
      setError('Failed to update order')
    } finally {
      setActionKey(null)
    }
  }, [orders, prepInputs, refresh])


  const incomingOrders = useMemo(() => 
    orders.filter(o => ['PAID', 'PENDING'].includes(o.status)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 
  [orders])

  const activeOrders = useMemo(() => 
    orders.filter(o => ['CONFIRMED', 'READY'].includes(o.status)).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), 
  [orders])

  const handleSettingChange = async (canteenId: string, field: string, value: any) => {
     // Optimistic
     const prev = canteenSettings
     setCanteenSettings(curr => curr.map(c => c.id === canteenId ? { ...c, [field]: value } : c))
     
     const updated = canteenSettings.find(c => c.id === canteenId)
     if(!updated) return

     try {
       await fetch('/api/vendor/settings', {
         method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canteenId,
            openingTime: updated.openingTime,
            closingTime: updated.closingTime,
            weeklySchedule: updated.weeklySchedule,
            autoMode: updated.autoMode,
            manualIsOpen: updated.manualIsOpen,
            [field]: value // ensure new value is sent
          })
       })
     } catch {
       setCanteenSettings(prev) // Rollback
     }
  }

  const handleWeeklyScheduleSave = async (canteenId: string, schedule: WeeklySchedule) => {
    // Optimistic
    const prev = canteenSettings
    setCanteenSettings(curr => curr.map(c => c.id === canteenId ? { ...c, weeklySchedule: schedule } : c))
    
    try {
       await fetch('/api/vendor/settings', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ canteenId, weeklySchedule: schedule })
       })
       setScheduleEditorCanteenId(null)
    } catch {
       setCanteenSettings(prev)
       setError('Failed to save schedule')
    }
  }

  const toggleMenuItem = async (canteenId: string, itemId: string, available: boolean) => {
    setCanteenSettings(prev => prev.map(c => {
        if(c.id !== canteenId) return c
        return { ...c, menuItems: c.menuItems.map(i => i.id === itemId ? { ...i, available } : i) }
    }))
    try {
        await fetch('/api/vendor/menu-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ menuItemId: itemId, available })
        })
    } catch {}
  }

  // --- Helper Sub-components ---
  
  function PrepBadge({ minutes }: { minutes: number | null }) {
     if (minutes === null) return null
     return (
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
           <Clock className="w-3 h-3" /> {minutes}m prep
        </span>
     )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans text-slate-900">
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-slate-900 text-white p-2 rounded-lg">
                <ChefHat className="h-5 w-5" />
             </div>
             <div>
                <h1 className="text-lg font-bold leading-none">{vendorName ?? 'Vendor Portal'}</h1>
                <p className="text-xs text-slate-500 font-medium">Dashboard</p>
             </div>
          </div>

          <div className="flex items-center gap-2">
             <div className="hidden md:flex items-center px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                <span className="mr-2">●</span> Live Connection
             </div>
             <VendorButton variant="outline" size="sm" onClick={() => refresh()} loading={isRefreshing} className="h-9">
                <RefreshCw className="h-4 w-4" />
             </VendorButton>
             <Link href="/vendor/history">
                <VendorButton variant="secondary" size="sm" className="h-9 mr-2">
                   <Clock className="h-4 w-4 mr-2" /> History
                </VendorButton>
             </Link>
             <Link href="/vendor/terminal">
                <VendorButton className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent">
                   <LayoutDashboard className="h-4 w-4 mr-2" /> Launch Terminal
                </VendorButton>
             </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Stats Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <VendorCard className="p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                   <p className="text-sm font-medium text-slate-500">Total Revenue</p>
                   <p className="text-2xl font-bold tracking-tight mt-1">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                   <DollarSign className="h-5 w-5" />
                </div>
             </VendorCard>

             <VendorCard className="p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                   <p className="text-sm font-medium text-slate-500">Orders Today</p>
                   <p className="text-2xl font-bold tracking-tight mt-1">{stats.totalOrders}</p>
                </div>
                <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                   <ShoppingBag className="h-5 w-5" />
                </div>
             </VendorCard>

             <VendorCard className="p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                   <p className="text-sm font-medium text-slate-500">Top Item</p>
                   <p className="text-lg font-bold leading-snug mt-1 truncate max-w-[150px]" title={stats.popularItems[0]?.name}>
                      {stats.popularItems[0]?.name ?? 'N/A'}
                   </p>
                   {stats.popularItems[0] && <span className="text-xs text-slate-400">{stats.popularItems[0].quantity} sold</span>}
                </div>
                <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                   <TrendingUp className="h-5 w-5" />
                </div>
             </VendorCard>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Live Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Col: Incoming (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                   <h2 className="text-lg font-bold flex items-center gap-2">
                     Incoming Orders
                     {incomingOrders.length > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{incomingOrders.length}</span>}
                   </h2>
                </div>

                {incomingOrders.length === 0 && (
                   <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50">
                      <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                         <Bell className="h-6 w-6" />
                      </div>
                      <p className="text-slate-900 font-medium">All caught up!</p>
                      <p className="text-slate-500 text-sm">Waiting for new orders...</p>
                   </div>
                )}

                <div className="space-y-4">
                   {incomingOrders.map(order => (
                      <VendorCard key={order.id} className="overflow-hidden border-l-4 border-l-rose-500">
                         <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                               <div>
                                  <div className="flex items-center gap-2 mb-1">
                                     <VendorBadge variant="neutral">{order.canteen.name}</VendorBadge>
                                     <span className="text-xs text-slate-400 font-medium">{formatTimeAgo(order.createdAt)}</span>
                                  </div>
                                  <h3 className="text-lg font-bold text-slate-900">
                                     Ticket #{getTicketNumber(order.id)}
                                     <span className="font-normal text-slate-500 mx-2">•</span>
                                     {order.user?.name?.split(' ')[0] ?? 'Guest'}
                                  </h3>
                               </div>
                               <div className="text-right">
                                  <p className="text-xl font-bold text-slate-900">{formatCurrency(order.totalCents)}</p>
                                  <VendorBadge variant={order.fulfillmentType === 'DINE_IN' ? 'warning' : 'default'} className="mt-1">
                                    {order.fulfillmentType.replace('_', ' ')}
                                  </VendorBadge>
                               </div>
                            </div>

                            {/* Items */}
                            <div className="bg-slate-50 rounded-lg p-3 space-y-2 mb-4">
                               {order.items.map(item => (
                                 <div key={item.id} className="flex justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                       <span className="flex h-5 w-5 items-center justify-center rounded bg-white border border-slate-200 font-bold text-xs shadow-sm">
                                         {item.quantity}
                                       </span>
                                       <span className="font-medium text-slate-700">{item.menuItem?.name ?? 'Unknown'}</span>
                                    </div>
                                    <span className="text-slate-500">{formatCurrency(item.priceCents * item.quantity)}</span>
                                 </div>
                               ))}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                               <VendorButton 
                                 className="flex-1 h-12 text-base bg-slate-900 hover:bg-slate-800" 
                                 loading={actionKey === `${order.id}:CONFIRM`}
                                 onClick={() => handleAction(order.id, 'CONFIRM')}
                               >
                                 Accept Order
                               </VendorButton>
                               <VendorButton 
                                 variant="danger" // Using explicit danger variant
                                 className="w-24 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:text-rose-700" 
                                 loading={actionKey === `${order.id}:CANCELLED`}
                                 onClick={() => handleAction(order.id, 'CANCELLED')}
                               >
                                 Reject
                               </VendorButton>
                               
                               {/* Prep Time Stepper - Simplified */}
                               <div className="flex items-center border border-slate-200 rounded-lg bg-white h-12 px-1">
                                  <button 
                                     onClick={() => setPrepInputs(prev => ({...prev, [order.id]: String(Math.max(5, (Number(prev[order.id]) || (order.prepMinutes || 15)) - 5)) }))}
                                     className="h-10 w-8 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded"
                                  >-</button>
                                  <span className="w-10 text-center font-bold text-sm">{(Number(prepInputs[order.id]) || order.prepMinutes || 15)}m</span>
                                  <button 
                                     onClick={() => setPrepInputs(prev => ({...prev, [order.id]: String((Number(prev[order.id]) || (order.prepMinutes || 15)) + 5) }))}
                                     className="h-10 w-8 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded"
                                  >+</button>
                               </div>
                            </div>
                         </div>
                      </VendorCard>
                   ))}
                </div>
            </div>

            {/* Right Col: Active (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
               <h2 className="text-lg font-bold flex items-center gap-2 text-slate-700">In Kitchen ({activeOrders.length})</h2>
               
               <div className="space-y-3">
                  {activeOrders.length === 0 && (
                     <div className="p-6 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                        <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Kitchen is clear</p>
                     </div>
                  )}

                  {activeOrders.map(order => (
                     <VendorCard key={order.id} className={`p-4 relative overflow-hidden ${order.status === 'READY' ? 'border-emerald-500 ring-1 ring-emerald-500' : ''}`}>
                        {order.status === 'READY' && (
                           <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                              READY FOR PICKUP
                           </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-3">
                           <div>
                              <div className="font-bold text-lg text-slate-900">#{getTicketNumber(order.id)}</div>
                              <div className="text-xs text-slate-500">{order.fulfillmentType.replace('_', ' ')} • {order.items.length} items</div>
                           </div>
                           <PrepBadge minutes={order.prepMinutes} />
                        </div>

                        <div className="space-y-1 mb-4">
                           {order.items.map(item => (
                              <div key={item.id} className="text-sm flex gap-2">
                                 <b className="text-slate-900">{item.quantity}x</b>
                                 <span className="text-slate-600 truncate">{item.menuItem?.name}</span>
                              </div>
                           ))}
                        </div>

                        <div className="flex gap-2">
                           {order.status !== 'READY' && (
                              <VendorButton 
                                 className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" 
                                 loading={actionKey === `${order.id}:READY`}
                                 onClick={() => handleAction(order.id, 'READY')}
                                 size="sm"
                              >
                                 Mark Ready
                              </VendorButton>
                           )}
                           <VendorButton 
                              variant={order.status === 'READY' ? 'primary' : 'secondary'}
                              className="flex-1"
                              loading={actionKey === `${order.id}:COMPLETED`}
                              onClick={() => handleAction(order.id, 'COMPLETED')}
                              title="Complete Order"
                           >
                              <CheckCircle2 className="h-4 w-4" />
                           </VendorButton>
                        </div>
                     </VendorCard>
                  ))}
               </div>
            </div>
        </div>

        {/* Store Management Section */}
        <section className="pt-8 border-t border-slate-200">
           <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Store className="h-5 w-5 text-slate-500" /> Canteen Status & Quick Menu
           </h2>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {canteenSettings.map(canteen => (
                  <VendorCard key={canteen.id} className="overflow-hidden bg-slate-50/50">
                     <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <div className={`h-2.5 w-2.5 rounded-full ${canteen.manualIsOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                             <div>
                               <h3 className="font-bold text-slate-900 leading-tight">{canteen.name}</h3>
                               <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                 {canteen.autoMode ? 'Auto Schedule' : 'Manual Mode'}
                               </p>
                             </div>
                         </div>
                         <div className="flex bg-slate-100 rounded-lg p-0.5 relative z-0">
                            {!canteen.autoMode && (
                              <>
                                <button 
                                  onClick={() => handleSettingChange(canteen.id, 'manualIsOpen', true)}
                                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${canteen.manualIsOpen ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >On</button>
                                <button 
                                  onClick={() => handleSettingChange(canteen.id, 'manualIsOpen', false)}
                                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${!canteen.manualIsOpen ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >Off</button>
                                <div className="w-px bg-slate-200 mx-1"></div>
                              </>
                            )}
                            <button 
                               onClick={() => handleSettingChange(canteen.id, 'autoMode', !canteen.autoMode)}
                               className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${canteen.autoMode ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                               title="Toggle Auto/Manual Mode"
                            >
                               {canteen.autoMode ? 'Auto' : 'Manual'}
                            </button>
                         </div>
                     </div>

                     {/* Schedule Config Link */}
                     {canteen.autoMode && (
                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                          <button 
                            onClick={() => setScheduleEditorCanteenId(canteen.id)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                             <Settings className="w-3 h-3" /> Configure Schedule
                          </button>
                        </div>
                     )}

                     {/* Quick Menu Toggles */}
                     <div className="p-3 max-h-60 overflow-y-auto space-y-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Quick Availability</p>
                        {canteen.menuItems.slice(0, 10).map(item => (
                           <div key={item.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 group">
                              <span className={`text-sm ${item.available ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{item.name}</span>
                              <input 
                                 type="checkbox" 
                                 checked={item.available}
                                 onChange={(e) => toggleMenuItem(canteen.id, item.id, e.target.checked)}
                                 className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                              />
                           </div>
                        ))}
                        {canteen.menuItems.length > 10 && (
                            <Link href="/vendor/menu" className="block text-center text-xs text-blue-600 hover:underline pt-2">View all {canteen.menuItems.length} items</Link>
                        )}
                     </div>
                  </VendorCard>
              ))}
           </div>
        </section>



      </main>

      {/* Schedule Editor Modal */}
      {scheduleEditorCanteenId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
           <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                 <h3 className="font-bold text-slate-900">Configure Weekly Schedule</h3>
                 <button onClick={() => setScheduleEditorCanteenId(null)} className="text-slate-400 hover:text-slate-900">
                    <X className="h-5 w-5" />
                 </button>
              </div>
              <div className="p-0">
                  {(() => {
                      const canteen = canteenSettings.find(c => c.id === scheduleEditorCanteenId)
                      if (!canteen) return null
                      let schedule: WeeklySchedule = DEFAULT_WEEKLY_SCHEDULE
                      try {
                        if (canteen.weeklySchedule) {
                           schedule = typeof canteen.weeklySchedule === 'string' 
                             ? JSON.parse(canteen.weeklySchedule) 
                             : canteen.weeklySchedule as WeeklySchedule
                        }
                      } catch {}
                      
                      return (
                         <div className="vendor-schedule-wrapper">
                             <WeeklyScheduleEditor 
                               canteenName={canteen.name}
                               initialSchedule={schedule}
                               onSave={(s) => handleWeeklyScheduleSave(canteen.id, s)}
                             />
                         </div>
                      )
                  })()}
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
