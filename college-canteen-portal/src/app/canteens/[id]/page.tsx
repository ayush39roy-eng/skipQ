"use client"
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

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
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 lg:flex-row">
        <section className="flex-1">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-white">Menu</h1>
          </div>
          <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-sm py-3">
            <label className="block">
              <div className="relative h-12">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for food items..." className="form-input h-12 w-full rounded-lg border border-gray-800 bg-gray-900 pl-12 text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500" />
                <span className="absolute inset-y-0 left-0 grid w-12 place-items-center text-blue-400">🔎</span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((it) => (
              <div key={it.id} className="group flex flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/50 hover:shadow-lg">
                <div className="h-44 w-full bg-cover bg-center" style={{ backgroundImage: `url('${it.imageUrl || 'https://picsum.photos/600/400?blur=3'}')` }} />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-100">{it.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-400">{it.description || 'Tasty item from the canteen menu.'}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-lg font-bold text-white">₹{(it.priceCents / 100).toFixed(2)}</p>
                    {(cart[it.id] ?? 0) === 0 ? (
                      <button className="flex h-9 w-28 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500" onClick={() => setCart(c => ({ ...c, [it.id]: 1 }))}>Add</button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700" onClick={() => setCart(c => ({ ...c, [it.id]: Math.max((c[it.id] ?? 0) - 1, 0) }))}>-</button>
                        <span className="text-lg font-bold text-white">{cart[it.id] ?? 0}</span>
                        <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700" onClick={() => setCart(c => ({ ...c, [it.id]: (c[it.id] ?? 0) + 1 }))}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-sm text-gray-400">No items match “{q}”.</div>
            )}
          </div>
        </section>

        <aside className="w-full lg:w-80 xl:w-96">
          <div className="sticky top-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <h3 className="text-xl font-bold text-gray-100">My Order</h3>
              <button className="text-sm font-medium text-gray-400 hover:text-red-400" onClick={() => setCart({})}>Clear Cart</button>
            </div>
            <div className="max-h-64 space-y-4 overflow-y-auto py-4">
              {Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => {
                const it = items.find(x => x.id === id)!
                return (
                  <div key={id} className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url('${it?.imageUrl || 'https://picsum.photos/200'}')` }} />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-100">{it?.name}</p>
                      <p className="text-sm font-semibold text-blue-400">₹{((it?.priceCents || 0) / 100).toFixed(2)}</p>
                    </div>
                    <span className="text-sm font-bold text-white">x{q}</span>
                  </div>
                )
              })}
              {Object.values(cart).reduce((a, b) => a + b, 0) === 0 && (
                <p className="text-center text-sm text-gray-500">No items added yet.</p>
              )}
            </div>
            <div className="space-y-2 border-t border-gray-800 pt-4 text-sm">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>₹{(subtotalCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Platform fee (2.5%)</span><span>₹{(platformFeeCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between text-lg font-bold text-gray-100"><span>Total</span><span>₹{(grandTotalCents / 100).toFixed(2)}</span></div>
            </div>
            <button disabled={subtotalCents <= 0} onClick={order} className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-blue-600 text-white text-base font-bold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">Checkout</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
