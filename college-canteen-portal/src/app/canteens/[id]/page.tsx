"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Item = { id: string; name: string; priceCents: number; imageUrl?: string | null }

export default function CanteenMenuPage() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<Item[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})

  useEffect(()=>{
    fetch(`/api/menu/${id}`).then(r=>r.json()).then(setItems)
  },[id])

  const totalCents = items.reduce((acc, it) => acc + (cart[it.id] ?? 0) * it.priceCents, 0)

  const order = async () => {
    const orderItems = Object.entries(cart).filter(([,q])=>q>0).map(([menuItemId, quantity])=>({ menuItemId, quantity }))
    const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canteenId: id, items: orderItems }) })
    const data = await res.json()
    if (res.ok) {
      window.location.href = `/order/${data.id}`
    } else {
      alert(data.error ?? 'Failed to create order')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Menu</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map(it => (
          <div key={it.id} className="card flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {it.imageUrl && (
                <img src={it.imageUrl} alt={it.name} className="h-16 w-20 rounded object-cover" />
              )}
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-sm text-gray-600">₹{(it.priceCents/100).toFixed(2)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn" onClick={()=>setCart(c=>({ ...c, [it.id]: Math.max((c[it.id] ?? 0)-1, 0) }))}>-</button>
              <div className="w-8 text-center">{cart[it.id] ?? 0}</div>
              <button className="btn" onClick={()=>setCart(c=>({ ...c, [it.id]: (c[it.id] ?? 0)+1 }))}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="card flex items-center justify-between">
        <div>Total: ₹{(totalCents/100).toFixed(2)}</div>
        <button className="btn" disabled={totalCents<=0} onClick={order}>Confirm Order</button>
      </div>
    </div>
  )
}
