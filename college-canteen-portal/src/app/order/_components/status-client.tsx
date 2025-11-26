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

  const variant = ['PAID', 'CONFIRMED', 'COMPLETED'].includes(status) ? 'success' : status === 'CANCELLED' ? 'danger' : 'info'
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">Current Status: <Badge variant={variant}>{status}</Badge></div>
      {paymentStatus && <div className="text-muted">Payment: {paymentStatus}</div>}
      {prep != null && status !== 'CANCELLED' && (
        <div className="text-muted">
          <div>Prep time: <span className="font-medium">{prep} min</span></div>
          {endAt != null && (
            <div className="text-sm text-[rgb(var(--text-muted))] mt-1">Approx ready at <span className="font-medium">{new Date(endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> — <span className="font-medium">{remainingMinutes != null ? (remainingMinutes > 0 ? `${remainingMinutes} min` : 'Ready') : ''}</span></div>
          )}
        </div>
      )}

      {status === 'CANCELLED' && (
        <div className="mt-2 p-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
          <div className="font-medium">Refund initiated</div>
          <div className="mt-1">Your order has been cancelled and the refund process has been initiated. The refund will be processed shortly and should reflect in your original payment method within a few business days. We will notify you once the refund is complete.</div>
        </div>
      )}

      {status === 'COMPLETED' && (
        <div className="text-emerald-400">Vendor marked this order completed.</div>
      )}
      {error && <div className="text-xs text-amber-500">Update error: {error}</div>}
    </div>
  )
}
