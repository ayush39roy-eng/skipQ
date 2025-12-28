'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus } from '@/app/vendor/actions'
import { Button } from '@/components/ui/Button'

type OrderItem = {
  quantity: number
  menuItem: { name: string }
}

type Order = {
  id: string
  fulfillmentType: string
  items: OrderItem[]
  status: string
  createdAt: Date
  cookingInstructions: string | null
}

export default function KdsBoard({ initialOrders }: { initialOrders: Order[] }) {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const prevOrderCountRef = useRef(initialOrders.length)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Sync state when props change (from server refresh)
  useEffect(() => {
    // Check if new orders arrived to play sound
    if (initialOrders.length > prevOrderCountRef.current) {
      playNotificationSound()
    }
    prevOrderCountRef.current = initialOrders.length
    setOrders(initialOrders)
  }, [initialOrders])

  // Poll for updates every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 15000)
    return () => clearInterval(interval)
  }, [router])

  useEffect(() => {
    audioRef.current = new Audio('/sounds/new-order.mp3')
  }, [])

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e))
    }
  }

  const handleStatusUpdate = async (orderId: string, transformToStatus: string) => {
    setLoadingId(orderId)
    
    // Optimistic update
    const previousOrders = [...orders]
    setOrders(current => {
      if (transformToStatus === 'COMPLETED') {
        return current.filter(o => o.id !== orderId)
      }
      return current.map(o => o.id === orderId ? { ...o, status: transformToStatus } : o)
    })

    const result = await updateOrderStatus(orderId, transformToStatus)

    if (!result.success) {
      // Revert if failed
      setOrders(previousOrders)
      alert('Failed to update status')
    }
    
    setLoadingId(null)
    router.refresh()
  }

  const formatTime = (date: Date) => {
     const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
     return `${diff}m ago`
  }

  return (
    <div className="min-h-screen bg-[var(--vendor-bg)] p-4 text-[var(--vendor-text-primary)] font-sans">
      <header className="mb-6 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--vendor-text-primary)]">Kitchen Display System</h1>
            <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
         </div>
         <div className="flex gap-4 items-center">
            <Button variant="outline" onClick={() => router.refresh()} className="bg-[var(--vendor-surface)] text-[var(--vendor-text-secondary)] border-[var(--vendor-border)] hover:bg-[var(--vendor-bg)] hover:text-[var(--vendor-text-primary)]">
                Refresh
            </Button>
            <div className="text-right">
               <div className="text-xs font-bold text-[var(--vendor-text-secondary)] uppercase tracking-wider">Total Active</div>
               <div className="text-xl font-black text-[var(--vendor-accent)]">{orders.length}</div>
            </div>
         </div>
      </header>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {orders.length === 0 ? (
           <div className="col-span-full py-40 text-center flex flex-col items-center justify-center opacity-50">
              <div className="text-6xl mb-4 grayscale">👨‍🍳</div>
              <h3 className="text-2xl font-bold text-[var(--vendor-text-primary)]">All clear!</h3>
              <p className="text-[var(--vendor-text-secondary)]">No active orders in the queue.</p>
           </div>
        ) : (
           orders.map((order) => {
             const timeStr = formatTime(order.createdAt)
             const minutes = parseInt(timeStr)
             const isUrgent = minutes > 15
             const isReady = order.status === 'READY'
             const isPreparing = order.status === 'PREPARING'
             const isLoading = loadingId === order.id

             let borderColor = 'border-l-[var(--vendor-border)]'
             let statusColor = 'text-[var(--vendor-text-secondary)]'
             
             if (order.status === 'ACCEPTED' || order.status === 'PAID') {
                 borderColor = 'border-l-blue-500'
                 statusColor = 'text-blue-500'
             }
             if (isPreparing) {
                 borderColor = 'border-l-orange-500'
                 statusColor = 'text-orange-500'
             }
             if (isReady) {
                 borderColor = 'border-l-emerald-500'
                 statusColor = 'text-emerald-500'
             }
             if (isUrgent && !isReady) {
                 borderColor = 'border-l-red-500'
                 statusColor = 'text-red-500'
             }

             return (
               <div 
                 key={order.id} 
                 className={`flex flex-col justify-between rounded-xl border-l-4 bg-[var(--vendor-surface)] p-4 shadow-sm ring-1 ring-[var(--vendor-border)] transition-all hover:shadow-md ${borderColor} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
               >
                  <div>
                     <div className="mb-3 flex items-start justify-between">
                        <div>
                           <span className="block text-xl font-black text-[var(--vendor-text-primary)]">#{order.id.slice(-4).toUpperCase()}</span>
                           <span className={`text-[10px] sm:text-xs uppercase tracking-wider font-extrabold ${statusColor}`}>
                             {order.fulfillmentType} • {order.status}
                           </span>
                        </div>
                        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${
                           isUrgent && !isReady ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-[var(--vendor-bg)] text-[var(--vendor-text-secondary)] border border-[var(--vendor-border)]'
                        }`}>
                           {timeStr}
                        </span>
                     </div>
                     
                     <div className="h-px bg-[var(--vendor-border)] my-3"></div>

                     <ul className="mb-4 space-y-3">
                        {order.items.map((item, i) => (
                           <li key={i} className="flex justify-between items-start text-sm sm:text-base">
                              <span className="text-[var(--vendor-text-primary)] font-medium leading-tight pr-2">{item.menuItem.name}</span>
                              <span className="font-bold text-[var(--vendor-accent)] whitespace-nowrap">x {item.quantity}</span>
                           </li>
                        ))}
                     </ul>
  
                     {order.cookingInstructions && (
                        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 flex gap-2">
                           <span className="text-lg">⚠️</span>
                           <span className="font-medium">{order.cookingInstructions}</span>
                        </div>
                     )}
                  </div>
  
                  <div className="mt-4 space-y-2">
                    {/* Action Buttons */}
                    {(order.status === 'ACCEPTED' || order.status === 'PAID' || order.status === 'PENDING') && (
                       <Button 
                         onClick={() => handleStatusUpdate(order.id, 'PREPARING')}
                         disabled={isLoading}
                         className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                       >
                          START PREP
                       </Button>
                    )}

                    {isPreparing && (
                       <Button 
                         onClick={() => handleStatusUpdate(order.id, 'READY')}
                         disabled={isLoading}
                         className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold"
                       >
                          MARK READY
                       </Button>
                    )}

                    {isReady && (
                       <Button 
                         onClick={() => handleStatusUpdate(order.id, 'COMPLETED')}
                         disabled={isLoading}
                         className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                       >
                          COMPLETE
                       </Button>
                    )}
                  </div>
               </div>
             )
          })
        )}
      </div>
    </div>
  )
}
