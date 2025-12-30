'use client'

import { useState, useEffect, useRef } from 'react'
import { VendorItem, VendorOrder, LedgerEntry, PaymentMode, FulfillmentType } from '@/types/vendor'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { VendorMode } from '@/types/vendor'

// Server Actions
import { createPosOrder, updateOrderStatus } from '@/app/vendor/actions'

// Local Components
import { OrderStream } from './OrderStream'
import { MenuGrid } from './MenuGrid'
import { LedgerView } from './LedgerView'
import { ActionSidebar } from './ActionSidebar'
import { Toast, ToastType } from '@/components/ui/Toast'
import { AnalyticsDashboard } from './AnalyticsDashboard'
import SettingsDashboard from '../settings/SettingsDashboard'
import MenuManager from '../menu/MenuManager'
import InventoryDashboard from '../inventory/InventoryDashboard'

interface TerminalLayoutProps {
  menuItems: VendorItem[]
  initialOrders: VendorOrder[]
  initialLedger: LedgerEntry[]
  vendorId: string
  analyticsData: {
    revenue: number
    orders: number
    activeOrders?: number
    avgValue: number
    hourlyTraffic: { hour: string; sales: number }[]
    topItems: { name: string; count: number }[]
  }
  vendorMode: string
  settingsData: {
      vendor: {
          id: string
          name: string
          email: string
          phone: string | null
          whatsappEnabled: boolean
      }
      canteen: {
          id: string
          name: string
          location: string
          notificationPhones: string[]
          isOpen: boolean
          autoMode: boolean
          weeklySchedule: any
      }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inventoryItems: any[]
}

export function TerminalLayout({ 
  menuItems, 
  initialOrders,
  initialLedger,
  vendorId,
  analyticsData,

  vendorMode,
  settingsData,
  inventoryItems
}: TerminalLayoutProps) {
  
  // -- URL STATE --
  const searchParams = useSearchParams()

  const rawView = searchParams.get('view') 
  const viewMode = (rawView === 'ORDERS' || rawView === 'POS' || rawView === 'LEDGER' || rawView === 'ANALYTICS' || rawView === 'REPORTS' || rawView === 'SETTINGS' || rawView === 'MENU' || rawView === 'INVENTORY') 
    ? rawView 
    : (vendorMode === 'ORDERS_ONLY' ? 'ORDERS' : 'POS')

  // -- INTERNAL STATE --
  const [orders, setOrders] = useState<VendorOrder[]>(initialOrders)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [reportTab, setReportTab] = useState<'DASHBOARD' | 'TRANSACTIONS'>('DASHBOARD')
  
  // Cart State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [cart, setCart] = useState<{ item: VendorItem; qty: number }[]>([])
  
  // UI State
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null

  // Pending mutations ref (orderId -> partial update)
  const pendingMutations = useRef<Map<string, Partial<VendorOrder>>>(new Map())

  // Server Revalidation Sync
  useEffect(() => {
    // Merge server state with any pending local mutations
    setOrders(initialOrders.map(serverOrder => {
      const pending = pendingMutations.current.get(serverOrder.id)
      if (pending) {
        return { ...serverOrder, ...pending }
      }
      return serverOrder
    }))
  }, [initialOrders])

  const showToast = (message: string, type: ToastType = 'SUCCESS') => {
    setToast({ message, type })
  }

  // -- HANDLERS --
  const handleSelectOrder = (id: string) => setSelectedOrderId(id)
  const handleCloseOrder = () => setSelectedOrderId(null)

  const handleAddToCart = (item: VendorItem) => {
    if (selectedOrderId) setSelectedOrderId(null) 
    setCart(prev => {
      const existing = prev.find(x => x.item.id === item.id)
      return existing 
        ? prev.map(x => x.item.id === item.id ? { ...x, qty: x.qty + 1 } : x)
        : [...prev, { item, qty: 1 }]
    })
  }

  const handleRemoveFromCart = (itemId: string) => setCart(prev => prev.filter(x => x.item.id !== itemId))
  const handleClearCart = () => setCart([])

  const handlePlaceOrder = async (paymentMode: PaymentMode, fulfillmentType: FulfillmentType) => {
    if (isProcessing) return
    
    if (cart.length === 0) {
        showToast('Cart is empty', 'ERROR')
        return
    }

    setIsProcessing(true)
    
    try {
        const itemsPayload = cart.map(c => ({
            itemId: c.item.id,
            quantity: c.qty,
            priceCents: c.item.priceCents
        }))

        const paymentStatus = (paymentMode === 'HOLD') ? 'PENDING' : 'SUCCESS'
        const result = await createPosOrder(vendorId, itemsPayload, paymentMode, fulfillmentType, paymentStatus)
        
        if (result.success) {
            setCart([])
            showToast('Order Placed Successfully', 'SUCCESS')
        } else {
            console.error(result.error)
            showToast('Failed to place order', 'ERROR')
        }
    } catch (e) {
        showToast('Network Error', 'ERROR')
    } finally {
        setIsProcessing(false)
    }
  }

  const handleUpdateStatus = async (orderId: string, status: string) => {
    // Validate Status
    const validStatuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED']
    if (!validStatuses.includes(status)) {
        console.error(`Invalid status: ${status}`)
        return
    }
    
    // 0. Capture Previous State for Rollback
    const previousOrders = [...orders]
    const previousOrder = orders.find(o => o.id === orderId)
    
    if (!previousOrder) return;

    // 1. Optimistic Update
    const mutation = { status: status as any } // We validated string above, safe to cast or better yet type properly
    pendingMutations.current.set(orderId, mutation)

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...mutation } : o))
    handleCloseOrder()
    
    // 2. Server Action
    try {
        const result = await updateOrderStatus(orderId, status)
        
        if (!result.success) {
            // FAILURE: Revert State
            console.error('Update failed:', result.error)
            
            // Remove pending mutation
            pendingMutations.current.delete(orderId)
            
            // Revert local state
            setOrders(previousOrders)
            
            showToast('Failed to update status', 'ERROR')
        } else {
            // SUCCESS
            pendingMutations.current.delete(orderId)
            showToast(`Order marked as ${status}`, 'SUCCESS')
        }
    } catch (e) {
        // NETWORK ERROR: Revert State
        pendingMutations.current.delete(orderId)
        setOrders(previousOrders)
        showToast('Network error updating status', 'ERROR')
    }
  }

  // -- RENDER MATRIX --
  return (
    <div className="flex h-screen w-full bg-vendor-bg text-vendor-text-primary font-sans overflow-hidden flex-col">
      {/* HEADER / NAVIGATION TABS */}
      <header className="bg-vendor-surface border-b border-vendor-border px-6 py-3 flex items-center justify-between shrink-0 z-50">
          <div className="flex items-center gap-6">
              <h1 className="font-bold text-lg tracking-tight">Terminal</h1>
              
              <nav className="flex bg-vendor-bg p-1 rounded-xl border border-vendor-border">
                  {vendorMode !== 'ORDERS_ONLY' && (
                    <Link 
                      href="?view=POS" 
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'POS' ? 'bg-white shadow-sm text-vendor-text-primary' : 'text-vendor-text-secondary hover:text-vendor-text-primary'}`}
                    >
                      Point of Sale
                    </Link>
                  )}
                  
                  <Link 
                    href="?view=ORDERS" 
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'ORDERS' ? 'bg-white shadow-sm text-vendor-text-primary' : 'text-vendor-text-secondary hover:text-vendor-text-primary'}`}
                  >
                    Orders
                  </Link>

                  {vendorMode !== 'ORDERS_ONLY' && (
                    <>
                      <Link 
                        href="?view=LEDGER" 
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'LEDGER' ? 'bg-white shadow-sm text-vendor-text-primary' : 'text-vendor-text-secondary hover:text-vendor-text-primary'}`}
                      >
                        Ledger
                      </Link>
                      <Link 
                        href="?view=ANALYTICS" 
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'ANALYTICS' ? 'bg-white shadow-sm text-vendor-text-primary' : 'text-vendor-text-secondary hover:text-vendor-text-primary'}`}
                      >
                        Analytics
                      </Link>
                      <Link 
                        href="?view=INVENTORY" 
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'INVENTORY' ? 'bg-white shadow-sm text-vendor-text-primary' : 'text-vendor-text-secondary hover:text-vendor-text-primary'}`}
                      >
                        Inventory
                      </Link>
                    </>
                  )}

                  <Link 
                     href="?view=MENU" 
                     className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'MENU' ? 'bg-white shadow-sm text-vendor-text-primary' : 'text-vendor-text-secondary hover:text-vendor-text-primary'}`}
                  >
                     Menu
                  </Link>
                  
                  <Link 
                     href="?view=SETTINGS" 
                     className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'SETTINGS' ? 'bg-white shadow-sm text-vendor-text-primary' : 'text-vendor-text-secondary hover:text-vendor-text-primary'}`}
                  >
                     Settings
                  </Link>
              </nav>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-100">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-bold">Online</span>
             </div>
          </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative items-stretch">

      
      {/* Toast Container */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* VIEW: POS/REGISTER */}
      {viewMode === 'POS' && (
        <>
          <OrderStream 
            orders={orders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={handleSelectOrder}
            viewMode="SIDEBAR"
          />
          
          <MenuGrid 
            items={menuItems}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            onItemClick={handleAddToCart}
          />

          <ActionSidebar 
            selectedOrder={selectedOrder}
            onCloseOrder={handleCloseOrder}
            onUpdateStatus={handleUpdateStatus}
            cart={cart}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={handleClearCart}
            onPlaceOrder={handlePlaceOrder}
            vendorMode={vendorMode}
          />
        </>
      )}

      {/* VIEW: ORDERS (KANBAN) */}
      {viewMode === 'ORDERS' && (
        <>
          <OrderStream 
            orders={orders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={handleSelectOrder}
            viewMode="FULL_PAGE"
          />
          
          {selectedOrderId && (
            <ActionSidebar 
                selectedOrder={selectedOrder}
                onCloseOrder={handleCloseOrder}
                onUpdateStatus={handleUpdateStatus}
                cart={[]}
                onRemoveFromCart={()=>{}}
                onClearCart={()=>{}}
                onPlaceOrder={()=>{}}
                vendorMode={vendorMode}
            />
          )}
        </>
      )}

      {/* VIEW: OTHERS */}
      {viewMode === 'REPORTS' && (
        <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-50">
           {/* Reports Header / Tabs */}
           <div className="px-8 pt-8 pb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">Reports & Insights</h2>
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                  <button 
                     onClick={() => setReportTab('DASHBOARD')}
                     className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reportTab === 'DASHBOARD' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                     Overview
                  </button>
                  <button 
                     onClick={() => setReportTab('TRANSACTIONS')}
                     className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${reportTab === 'TRANSACTIONS' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                     Transactions
                  </button>
              </div>
           </div>

           {/* Content */}
           <div className="flex-1 overflow-hidden relative">
              {reportTab === 'DASHBOARD' ? (
                  <AnalyticsDashboard data={analyticsData} />
              ) : (
                  <div className="absolute inset-0 p-6 overflow-hidden">
                      <LedgerView entries={initialLedger} />
                  </div>
              )}
           </div>
        </div>
      )}

      {/* VIEW: LEDGER */}
      {viewMode === 'LEDGER' && (
         <div className="flex-1 h-full overflow-hidden">
             <LedgerView entries={initialLedger} />
         </div>
      )}

      {/* VIEW: ANALYTICS */}
      {viewMode === 'ANALYTICS' && (
         <div className="flex-1 h-full overflow-hidden">
            <AnalyticsDashboard data={analyticsData} />
         </div>
      )}

      {/* VIEW: SETTINGS */}
      {viewMode === 'SETTINGS' && (
         <div className="flex-1 h-full overflow-y-auto bg-vendor-bg p-8">
             <SettingsDashboard vendor={settingsData.vendor} canteen={settingsData.canteen} />
         </div>
      )}

      {/* VIEW: MENU */}
      {viewMode === 'MENU' && (
         <div className="flex-1 h-full overflow-y-auto bg-vendor-bg p-8">
             <MenuManager 
                items={menuItems} 
                vendorId={vendorId} 
                inventoryItems={inventoryItems.map(i => ({ id: i.id, name: i.name, unit: i.unit }))}
             />
         </div>
      )}

      {/* VIEW: INVENTORY */}
      {viewMode === 'INVENTORY' && (
         <div className="flex-1 h-full overflow-y-auto bg-vendor-bg">
             <InventoryDashboard items={inventoryItems} vendorId={vendorId} />
         </div>
      )}

      </div>
    </div>
  )
}
