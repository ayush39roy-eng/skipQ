"use client"
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'

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

  const variant = status === 'PAID' || status === 'CONFIRMED' ? 'success' : status === 'CANCELLED' ? 'danger' : 'info'
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">Current Status: <Badge variant={variant}>{status}</Badge></div>
      {paymentStatus && <div className="text-muted">Payment: {paymentStatus}</div>}
      {prep != null && status !== 'CANCELLED' && (
        <div className="text-muted">Prep time: <span className="font-medium">{prep} min</span></div>
      )}
      {status === 'CANCELLED' && (
        <div className="text-rose-500 font-medium">This order was cancelled.</div>
      )}
      {error && <div className="text-xs text-amber-500">Update error: {error}</div>}
    </div>
  )
}
