'use client'

import { useState, useEffect, useRef } from 'react'
import { VendorItem, VendorOrder, LedgerEntry, PaymentMode, FulfillmentType } from '@/types/vendor'
import { useSearchParams } from 'next/navigation'

// Server Actions
import { createPosOrder, updateOrderStatus } from '@/app/vendor/actions'

// Local Components
import { OrderStream } from './OrderStream'
import { MenuGrid } from './MenuGrid'
import { LedgerView } from './LedgerView'
import { ActionSidebar } from './ActionSidebar'
import { Toast, ToastType } from '@/components/ui/Toast'
import { AnalyticsDashboard } from './AnalyticsDashboard'

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
}

export function TerminalLayout({ 
  menuItems, 
  initialOrders,
  initialLedger,
  vendorId,
  analyticsData
}: TerminalLayoutProps) {
  
  // -- URL STATE --
  const searchParams = useSearchParams()
  const rawView = searchParams.get('view') 
  const viewMode = (rawView === 'ORDERS' || rawView === 'POS' || rawView === 'LEDGER' || rawView === 'ANALYTICS' || rawView === 'REPORTS') 
    ? rawView 
    : 'POS'

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
    <div className="flex h-screen w-full bg-vendor-bg text-vendor-text-primary font-sans overflow-hidden items-stretch">

      
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

    </div>
  )
}
