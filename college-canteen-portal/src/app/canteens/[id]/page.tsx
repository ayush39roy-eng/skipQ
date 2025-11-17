"use client"
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'

type Item = { id: string; name: string; priceCents: number; imageUrl?: string | null; description?: string | null }

export default function CanteenMenuPage() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<Item[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch(`/api/menu/${id}`).then(r => r.json()).then(setItems)
  }, [id])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return items
    return items.filter(it => it.name.toLowerCase().includes(query))
  }, [items, q])

  const subtotalCents = items.reduce((acc, it) => acc + (cart[it.id] ?? 0) * it.priceCents, 0)
  const platformFeeCents = Math.round(subtotalCents * 0.025)
  const grandTotalCents = subtotalCents // fee is for display; total charged remains items sum per backend logic

  const order = async () => {
    const orderItems = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity }))
    if (orderItems.length === 0) return
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canteenId: id, items: orderItems })
    })
    const data = await res.json()
    if (res.ok) {
      window.location.href = `/order/${data.id}`
    } else {
      alert(data.error ?? 'Failed to create order')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row">
      <section className="flex-1">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Menu</h1>
        </div>
        <div className="sticky top-16 z-10 bg-[rgb(var(--bg))]/80 py-2 backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--bg))]/50">
          <label className="block">
            <span className="sr-only">Search items</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for food items..." className="input" />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((it) => (
            <Card key={it.id} className="group overflow-hidden transition hover:border-[rgb(var(--accent))]/70 hover:shadow-md">
              <div className="relative h-44 w-full overflow-hidden rounded-md">
                <Image src={it.imageUrl || '/placeholder.svg'} alt={it.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{it.name}</h3>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">{it.description || 'Delicious item from the canteen menu.'}</p>
                </div>
                <p className="text-right text-base font-semibold">₹{(it.priceCents / 100).toFixed(2)}</p>
              </div>
              <div className="mt-3 flex justify-end">
                {(cart[it.id] ?? 0) === 0 ? (
                  <button className="btn" onClick={() => setCart(c => ({ ...c, [it.id]: 1 }))}>Add</button>
                ) : (
                  <Stepper value={cart[it.id] ?? 0} onChange={(v)=> setCart(c=> ({...c, [it.id]: v}))} />
                )}
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted">No items match “{q}”.</div>
          )}
        </div>
      </section>

      <aside className="w-full lg:w-80 xl:w-96">
        <Card className="sticky top-24">
          <div className="flex items-center justify-between pb-4">
            <h3 className="text-lg font-semibold">My Order</h3>
            <button className="text-sm text-muted hover:text-[rgb(var(--text))]" onClick={() => setCart({})}>Clear</button>
          </div>
          <div className="max-h-64 space-y-4 overflow-y-auto py-2">
            {Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => {
              const it = items.find(x => x.id === id)!
              return (
                <div key={id} className="flex items-start gap-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-md">
                    <Image src={it?.imageUrl || '/placeholder.svg'} alt="Item" fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{it?.name}</p>
                    <p className="text-sm text-muted">₹{((it?.priceCents || 0) / 100).toFixed(2)}</p>
                  </div>
                  <span className="text-sm font-semibold">x{q}</span>
                </div>
              )
            })}
            {Object.values(cart).reduce((a, b) => a + b, 0) === 0 && (
              <p className="text-center text-sm text-muted">No items added yet.</p>
            )}
          </div>
          <div className="space-y-2 border-t border-[rgb(var(--border))] pt-4 text-sm">
            <div className="flex justify-between text-muted"><span>Subtotal</span><span>₹{(subtotalCents / 100).toFixed(2)}</span></div>
            <div className="flex justify-between text-muted"><span>Platform fee (2.5%)</span><span>₹{(platformFeeCents / 100).toFixed(2)}</span></div>
            <div className="flex justify-between text-base font-semibold"><span>Total</span><span>₹{(grandTotalCents / 100).toFixed(2)}</span></div>
          </div>
          <Button disabled={subtotalCents <= 0} onClick={order} className="mt-4 w-full">Checkout</Button>
        </Card>
      </aside>
    </div>
  )
}
