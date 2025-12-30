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
  const [progress, setProgress] = useState(0)

  // ... (existing effects)

  // Update progress bar
  useEffect(() => {
    if (status !== 'CONFIRMED' || !updatedAt || !endAt) {
      setProgress(0)
      return
    }

    const updateProgress = () => {
      const now = Date.now()
      const totalDuration = endAt - updatedAt
      const elapsed = now - updatedAt
      
      if (totalDuration <= 0) {
        setProgress(100)
        return
      }

      const percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
      setProgress(percent)
    }

    updateProgress()
    const interval = setInterval(updateProgress, 1000)
    return () => clearInterval(interval)
  }, [status, updatedAt, endAt])

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
                      <div 
                        className="h-full bg-[#FF9F1C] transition-all duration-1000 ease-linear" 
                        style={{ width: `${progress}%` }}
                      ></div>
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
