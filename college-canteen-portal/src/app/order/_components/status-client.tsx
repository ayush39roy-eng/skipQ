"use client"
import { useEffect, useState } from 'react'

interface Props {
  orderId: string
  initialStatus: string
  initialPrep: number | null | undefined
  initialPaymentStatus: string | null
}

export default function OrderStatusClient({ orderId, initialStatus, initialPrep, initialPaymentStatus }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [prep, setPrep] = useState<number | null>(initialPrep ?? null)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(initialPaymentStatus)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    let currentController: AbortController | null = null

    const tick = async () => {
      if (currentController) currentController.abort()
      const controller = new AbortController()
      currentController = controller
      const timeout = setTimeout(() => controller.abort(), 10_000)
      try {
        const res = await fetch(`/api/orders/${orderId}`, { signal: controller.signal })
        if (!res.ok) throw new Error('Failed status fetch')
        const data = await res.json()
        if (!active) return
        setStatus(data.status)
        setPrep(data.prepMinutes)
        setUpdatedAt(data.updatedAt ? Date.parse(data.updatedAt) : null)
        setPaymentStatus(data.paymentStatus)
        setError(null)
      } catch (err) {
        const isAbort = err instanceof DOMException && err.name === 'AbortError'
        if (active && !isAbort) {
          const message = err instanceof Error ? err.message : 'Status update failed'
          setError(message)
        }
      } finally {
        clearTimeout(timeout)
        if (currentController === controller) {
          currentController = null
        }
      }
    }

    const interval = setInterval(tick, 5000)
    void tick()
    return () => {
      active = false
      clearInterval(interval)
      
      if (currentController) currentController.abort()
    }
  }, [orderId])

  // Recompute endAt whenever prep or updatedAt or status changes
  useEffect(() => {
    if (prep != null && updatedAt && status === 'CONFIRMED') {
      const computed = updatedAt + prep * 60_000
      setEndAt(computed)
      const diff = computed - Date.now()
      setRemainingMinutes(Math.max(0, Math.ceil(diff / 60000)))
    } else {
      setEndAt(null)
      setRemainingMinutes(null)
    }
  }, [prep, updatedAt, status])

  // Update remaining minutes while an endAt is set
  useEffect(() => {
    if (!endAt) {
      setRemainingMinutes(null)
      return
    }
    const update = () => {
      const diff = endAt - Date.now()
      setRemainingMinutes(Math.max(0, Math.ceil(diff / 60000)))
    }

    // initial update
    update()

    // schedule first aligned tick at the next minute boundary, then run every 60s
    let intervalId: number | null = null
    const now = Date.now()
    const msToNextMinute = 60000 - (now % 60000)
    const timeoutId = window.setTimeout(() => {
      update()
      intervalId = window.setInterval(update, 60000) as unknown as number
    }, msToNextMinute)

    return () => {
      clearTimeout(timeoutId as unknown as number)
      if (intervalId != null) clearInterval(intervalId)
    }
  }, [endAt])

  return (
    <div className="space-y-4">
      {status === 'PENDING' && (
         <div className="flex items-center gap-3 animate-pulse">
            <div className="bg-[#FFD166] border-2 border-black text-black px-4 py-2 rounded-full font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#000]">
              ⏳ Preparing Transaction...
            </div>
          </div>
      )}

      {status === 'CONFIRMED' && (
         <div className="space-y-4">
             <div className="flex flex-wrap items-center gap-2">
                 <div className="bg-[#06D6A0] border-2 border-black text-black px-4 py-2 rounded-lg font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#000]">
                    Cooking In Progress
                 </div>
                 {remainingMinutes !== null && (
                    <div className="bg-white border-2 border-black px-3 py-2 rounded-lg font-bold">
                        {remainingMinutes > 0 ? `${remainingMinutes}m remaining` : 'Almost Ready'}
                    </div>
                 )}
             </div>
             {endAt && (
                 <div className="w-full bg-slate-200 h-4 border-2 border-black rounded-full overflow-hidden relative">
                      <div className="h-full bg-[#FF9F1C] animate-pulse" style={{ width: '60%' }}></div>
                 </div>
             )}
         </div>
      )}

      {status === 'COMPLETED' && (
          <div className="flex items-center gap-2">
            <div className="bg-black text-white border-2 border-black px-4 py-2 rounded-lg font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#06D6A0]">
               Order Ready / Picked Up
            </div>
          </div>
      )}

       {status === 'CANCELLED' && (
        <div className="mt-2 p-4 rounded-xl bg-red-50 border-2 border-black text-black shadow-[4px_4px_0px_0px_#EF476F]">
          <div className="font-black uppercase mb-1">Order Cancelled</div>
          <div className="text-sm font-medium">Refund initiated. It will reflect in 5-7 business days.</div>
        </div>
      )}
      
      {/* Fallback for other statuses */}
      {!['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status) && (
        <div className="bg-white border-2 border-black px-4 py-2 rounded-lg font-bold shadow-[2px_2px_0px_0px_#000]">
            Status: {status}
        </div>
      )}

      {error && <div className="text-xs text-red-500 font-bold bg-white border border-black p-1 inline-block mt-2">Update error: {error}</div>}
    </div>
  )
}
