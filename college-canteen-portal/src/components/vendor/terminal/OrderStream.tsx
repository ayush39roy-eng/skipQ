'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { VendorOrder } from '@/types/vendor'

// Helper component for dynamic elapsed time
function ElapsedTimer({ createdAt }: { createdAt: Date }) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    const calculate = () => {
      const now = new Date()
      const elapsedSeconds = Math.floor((now.getTime() - new Date(createdAt).getTime()) / 1000)
      const minutes = Math.floor(elapsedSeconds / 60)
      const seconds = elapsedSeconds % 60
      setElapsed(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    calculate() // Initial calculation
    const interval = setInterval(calculate, 1000) // Update every second

    return () => clearInterval(interval)
  }, [createdAt])

  return <>{elapsed}</>
}

interface OrderStreamProps {
  orders: VendorOrder[]
  selectedOrderId: string | null
  onSelectOrder: (id: string) => void
  activeTab?: 'QUEUE' | 'HISTORY'
  onTabChange?: (tab: 'QUEUE' | 'HISTORY') => void
  viewMode: 'SIDEBAR' | 'FULL_PAGE' // New prop to determine layout
}

export function OrderStream({ 
  orders, 
  selectedOrderId, 
  onSelectOrder,
  activeTab = 'QUEUE',
  onTabChange,
  viewMode
}: OrderStreamProps) {
  

  
  // Main Logic
  const sortedOrders = useMemo(() => {
      return [...orders].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [orders])

  // Sound Effect for New Orders
  const prevCountRef = useRef(orders.length)
  useEffect(() => {
     if (orders.length > prevCountRef.current) {
         try {
             const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3')
             audio.volume = 0.5
             audio.play().catch(e => console.log('Audio play failed', e))
         } catch (e) {
             console.error('Sound error', e)
         }
     }
     prevCountRef.current = orders.length
  }, [orders.length])
  
  // -- MODE 1: SIDEBAR --
  if (viewMode === 'SIDEBAR') {
     const sidebarOrders = sortedOrders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status))
     
     return (
        <div className="flex w-[260px] flex-col border-r border-vendor-border bg-vendor-surface h-full shrink-0">
          <div className="p-4 border-b border-vendor-border flex justify-between items-center">
             <h3 className="font-bold text-vendor-text-primary text-sm">Live Orders</h3>
             <span className="bg-vendor-accent-soft text-vendor-accent px-2 py-0.5 rounded-full text-[10px] font-bold">{sidebarOrders.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto bg-vendor-bg p-2 space-y-2">
             {sidebarOrders.map(order => (
                <div 
                   key={order.id} 
                   onClick={() => onSelectOrder(order.id)}
                   className={`p-3 rounded-xl border cursor-pointer transition-all relative overflow-hidden ${
                     selectedOrderId === order.id 
                        ? 'bg-white border-vendor-accent shadow-md ring-1 ring-vendor-accent' 
                        : (order.source === 'ONLINE' ? 'bg-blue-50/30 border-blue-100 hover:border-blue-200' : 'bg-white border-vendor-border hover:border-vendor-accent')
                   }`}
                >
                   {order.source === 'ONLINE' && <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-bl-lg shadow-sm"></div>}
                   <div className="flex justify-between mb-1">
                      <span className="font-bold text-vendor-text-primary text-sm">{order.ticket}</span>
                      <span className="text-[10px] font-bold text-vendor-text-muted">{order.createdAt.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</span>
                   </div>
                   <div className="flex items-center gap-2 mb-2">
                      <span className={`h-2 w-2 rounded-full ${order.source === 'ONLINE' ? 'bg-blue-500' : 'bg-vendor-text-muted'}`}></span>
                      <span className="text-xs text-vendor-text-secondary font-medium capitalize">{order.status.toLowerCase()}</span>
                      {order.source === 'ONLINE' && <span className="text-[10px] font-extra-bold text-blue-600 bg-blue-50 px-1 rounded border border-blue-100">APP</span>}
                   </div>
                   <div className="flex justify-between items-end border-t border-vendor-divider pt-2">
                      <span className="text-xs text-vendor-text-muted font-medium">{order.items.length} items</span>
                      <span className="font-bold text-vendor-text-primary text-sm">₹{(order.totalCents * 1.05 / 100).toFixed(2)}</span>
                   </div>
                </div>
             ))}
          </div>
        </div>
     )
  }

  // -- MODE 2: FULL PAGE KANBAN (For Orders View) --
  const columns = [
     { id: 'PENDING', label: 'New', color: 'slate' },
     { id: 'ACCEPTED', label: 'Preparing', color: 'emerald' }, // Preparing -> Mint
     { id: 'READY', label: 'Ready', color: 'orange' },
     { id: 'COMPLETED', label: 'Completed', color: 'slate' }
  ]

  return (
    <div className="flex-1 h-full bg-vendor-bg overflow-x-auto p-6">
       <div className="flex gap-6 h-full min-w-[1000px]">
          {columns.map(col => {
             const colOrders = orders.filter(o => 
               col.id === 'PENDING' ? (o.status === 'PENDING') :
               col.id === 'ACCEPTED' ? (o.status === 'ACCEPTED' || o.status === 'PREPARING') :
               col.id === 'READY' ? (o.status === 'READY') :
               (o.status === 'COMPLETED')
             )

             // Dynamic color utility mapping isn't ideal with vars, so we keep using Tailwind colors for badges but aligned with Mineral logic
             // New (Pending) -> Neutral/Gray
             // Preparing -> Mint/Emerald
             // Ready -> Orange/Amber
             const badgeColor = 
                col.color === 'emerald' ? 'bg-vendor-accent text-white' : 
                col.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                'bg-vendor-surface text-vendor-text-secondary border border-vendor-border';

             return (
                <div key={col.id} className="flex-1 flex flex-col min-w-[300px]">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <h3 className="font-bold text-vendor-text-primary text-lg">{col.label}</h3>
                         <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeColor}`}>{colOrders.length}</span>
                      </div>
                   </div>
                   
                   <div className="flex-1 space-y-3">
                      {colOrders.map(order => (
                         <div key={order.id} className="bg-white border border-vendor-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-4">
                               <div>
                                  <div className="flex items-center gap-2 mb-1">
                                     <h4 className="font-bold text-xl text-vendor-text-primary">{order.ticket}</h4>
                                     {order.source === 'ONLINE' && (
                                        <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100">ONLINE</span>
                                     )}
                                     {order.source === 'COUNTER' && (
                                        <span className="bg-vendor-bg text-vendor-text-secondary text-[10px] font-bold px-1.5 py-0.5 rounded border border-vendor-border">COUNTER</span>
                                     )}
                                  </div>
                                  <p className="text-xs text-vendor-text-secondary font-medium">Placed at {order.createdAt.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</p>
                               </div>
                            </div>
                            
                            {/* Items */}
                            <div className="space-y-2 mb-5">
                               {order.items.slice(0, 3).map((item, idx) => (
                                  <div key={idx} className="flex gap-3 text-sm">
                                     <span className="font-bold text-vendor-text-muted w-5 text-right bg-vendor-bg rounded px-1">{item.quantity}</span>
                                     <span className="font-medium text-vendor-text-primary">{item.name}</span>
                                  </div>
                               ))}
                               {order.items.length > 3 && (
                                  <p className="text-xs text-vendor-text-muted pl-8">+ {order.items.length - 3} more items...</p>
                               )}
                            </div>

                            {/* Actions / Timer */}
                            <div className="flex justify-between items-center border-t border-vendor-divider pt-4">
                               {order.status === 'PENDING' ? (
                                  <div className="flex items-center gap-2 text-amber-600 font-mono font-bold text-sm bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                     <ElapsedTimer createdAt={order.createdAt} />
                                  </div>
                               ) : (
                                  <div className="text-vendor-text-secondary text-xs font-bold uppercase tracking-wide">
                                     {order.paymentStatus}
                                  </div>
                               )}
                               
                               <button 
                                 onClick={() => onSelectOrder(order.id)}
                                 className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all ${
                                    order.status === 'PENDING' 
                                       ? 'bg-vendor-accent text-white shadow-md shadow-vendor-accent-soft hover:opacity-90' 
                                       : 'bg-vendor-text-primary text-white hover:bg-black'
                                 }`}
                               >
                                  {order.status === 'PENDING' ? 'Start Prep' : 'Manage'}
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             )
          })}
       </div>
    </div>
  )
}
