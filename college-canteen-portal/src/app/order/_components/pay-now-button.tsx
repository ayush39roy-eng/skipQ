"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  orderId: string
}

export default function PayNowButton({ orderId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/payment/create-link?orderId=${orderId}`, {
        method: 'POST'
      })
      if (!res.ok) {
        throw new Error('Failed to create payment link')
      }
      const data = await res.json().catch(() => ({}))
      const redirectUrl = data.redirectUrl || data.url
      if (redirectUrl) {
        window.location.assign(redirectUrl)
        return
      }
      // Fallback to GET redirect if API responds with nothing
      window.location.href = `/api/payment/create-link?orderId=${orderId}`
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start payment. Please try again.'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" onClick={handleClick} disabled={loading}>
        {loading ? 'Redirecting…' : 'Pay Now'}
      </Button>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}
