"use client"
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

type Item = { id: string; name: string; priceCents: number; imageUrl?: string | null; description?: string | null }

export default function CanteenMenuPage() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<Item[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [q, setQ] = useState('')
  const [fulfillmentType, setFulfillmentType] = useState<'TAKEAWAY' | 'DINE_IN'>('TAKEAWAY')
  const [sortMode, setSortMode] = useState<'popular' | 'price'>('popular')

  useEffect(() => {
    fetch(`/api/menu/${id}`).then(r => r.json()).then(setItems)
  }, [id])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    let base = items
    if (query) {
      base = items.filter((it) =>
        it.name.toLowerCase().includes(query) ||
        (it.description || '').toLowerCase().includes(query)
      )
    }
    const sorted = [...base]
    if (sortMode === 'price') {
      sorted.sort((a, b) => a.priceCents - b.priceCents)
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    }
    return sorted
  }, [items, q, sortMode])

  const heroImage = useMemo(() => {
    return items.find((it) => it.imageUrl)?.imageUrl || '/placeholder.svg'
  }, [items])

  const priceStats = useMemo(() => {
    if (!items.length) return { avg: '0.00', min: '0.00', max: '0.00' }
    const cents = items.map((it) => it.priceCents)
    const avg = (cents.reduce((sum, val) => sum + val, 0) / items.length / 100).toFixed(2)
    const min = (Math.min(...cents) / 100).toFixed(2)
    const max = (Math.max(...cents) / 100).toFixed(2)
    return { avg, min, max }
  }, [items])

  const quickFilters = useMemo(() => ['Breakfast', 'Lunch', 'Snacks', 'Beverages'], [])
  const fulfillmentOptions: { label: string, value: 'TAKEAWAY' | 'DINE_IN', description: string }[] = useMemo(() => ([
    { label: 'Takeaway', value: 'TAKEAWAY', description: 'Grab & go from the counter' },
    { label: 'Dine-in', value: 'DINE_IN', description: 'Enjoy at the seating area' }
  ]), [])

  const subtotalCents = items.reduce((acc, it) => acc + (cart[it.id] ?? 0) * it.priceCents, 0)
  const platformFeeCents = Math.round(subtotalCents * 0.025)
  const grandTotalCents = subtotalCents + platformFeeCents

  const order = async () => {
    const orderItems = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity }))
    if (orderItems.length === 0) return
    const payload = { canteenId: id, items: orderItems, fulfillmentType }
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (res.ok) {
      window.location.href = `/order/${data.id}`
    } else {
      alert(data.error ?? 'Failed to create order')
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[rgb(var(--border))] bg-gradient-to-br from-[rgb(var(--surface))] via-[rgb(var(--surface-muted))] to-[rgb(var(--bg))] p-6 sm:p-10 shadow-[0_25px_60px_rgba(15,15,35,0.35)]">
        <div className="relative aspect-[16/6] w-full overflow-hidden rounded-3xl border border-white/10">
          <Image
            src={heroImage}
            alt="Canteen hero"
            fill
            sizes="100vw"
            priority={false}
            className="object-cover"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <Badge variant="info" className="bg-white/20 text-white backdrop-blur">Live menu</Badge>
            <h1 className="mt-3 text-3xl font-semibold">Made-to-order classics without the wait.</h1>
            <p className="mt-2 text-sm text-white/80">Browse {items.length || '—'} items and lock your prep slot before you leave class.</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 text-[rgb(var(--text))] sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Menu size</p>
            <p className="mt-2 text-3xl font-semibold">{items.length}</p>
            <p className="text-sm text-[rgb(var(--text-muted))]">Curated dishes live now</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Average</p>
            <p className="mt-2 text-3xl font-semibold">₹{priceStats.avg}</p>
            <p className="text-sm text-[rgb(var(--text-muted))]">Typical item cost</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Range</p>
            <p className="mt-2 text-3xl font-semibold">₹{priceStats.min} – ₹{priceStats.max}</p>
            <p className="text-sm text-[rgb(var(--text-muted))]">Budget to indulgent</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/80">
          {quickFilters.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setQ(tag)}
              className="rounded-full border border-white/30 px-3 py-1 transition hover:border-white"
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row">
        <section className="flex-1">
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
            <Input
              label="Search menu"
              placeholder="Type “wrap”, “cold coffee”, …"
              value={q}
              onChange={(e) => setQ((e.target as HTMLInputElement).value)}
              className="w-full"
            />
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {(['popular', 'price'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSortMode(mode)}
                  className={`rounded-full px-4 py-1.5 text-sm transition ${sortMode === mode ? 'bg-[rgb(var(--accent))] text-white' : 'border border-[rgb(var(--border))] text-[rgb(var(--text))]'}`}
                >
                  {mode === 'popular' ? 'Chef picks' : 'Lowest price'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((it) => (
              <Card key={it.id} className="group overflow-hidden border border-[rgb(var(--border))] transition hover:border-[rgb(var(--accent))] hover:shadow-xl">
                <div className="relative h-48 w-full overflow-hidden rounded-2xl">
                  <Image
                    src={it.imageUrl || '/placeholder.svg'}
                    alt={it.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                  />
                  <div className="absolute left-4 top-4">
                    <Badge variant="info" className="bg-black/70 text-white backdrop-blur">Best seller</Badge>
                  </div>
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{it.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{it.description || 'Freshly prepped, student approved.'}</p>
                  </div>
                  <p className="text-right text-base font-semibold">₹{(it.priceCents / 100).toFixed(2)}</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted">Avg prep 8 min</span>
                  {(cart[it.id] ?? 0) === 0 ? (
                    <button className="btn" onClick={() => setCart((c) => ({ ...c, [it.id]: 1 }))}>Add</button>
                  ) : (
                    <Stepper value={cart[it.id] ?? 0} onChange={(v) => setCart((c) => ({ ...c, [it.id]: v }))} />
                  )}
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-[rgb(var(--border))] p-12 text-center">
                <p className="text-lg font-semibold">No dishes match “{q}”.</p>
                <p className="mt-2 text-sm text-muted">Try a simpler keyword or tap a quick filter above.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="w-full lg:w-80 xl:w-96">
          <Card className="sticky top-24 space-y-4 border border-[rgb(var(--accent))]/20 bg-[rgb(var(--surface))]/70 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">My Order</h3>
                <p className="text-xs text-muted">Prep slot reserved for 10 minutes</p>
              </div>
              <button className="text-sm text-muted hover:text-[rgb(var(--text))]" onClick={() => setCart({})}>Clear</button>
            </div>
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]/40 p-3 text-sm">
              <p className="font-medium text-[rgb(var(--text))]">Dining preference</p>
              <div className="mt-2 flex flex-col gap-2">
                {fulfillmentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFulfillmentType(option.value)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${fulfillmentType === option.value ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10 text-[rgb(var(--text))]' : 'border-[rgb(var(--border))] text-muted hover:border-[rgb(var(--accent))]/40'}`}
                  >
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="text-xs text-muted">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-64 space-y-4 overflow-y-auto">
              {Object.entries(cart).filter(([, qty]) => qty > 0).map(([itemId, qty]) => {
                const it = items.find((x) => x.id === itemId)
                if (!it) return null
                return (
                  <div key={itemId} className="flex items-start gap-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                      <Image
                        src={it.imageUrl || '/placeholder.svg'}
                        alt={it.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{it.name}</p>
                      <p className="text-sm text-muted">₹{(it.priceCents / 100).toFixed(2)}</p>
                    </div>
                    <span className="text-sm font-semibold">×{qty}</span>
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
              <div className="flex justify-between text-base font-semibold"><span>Total (charged)</span><span>₹{(grandTotalCents / 100).toFixed(2)}</span></div>
            </div>
            <Button disabled={subtotalCents <= 0} onClick={order} className="w-full">Checkout</Button>
          </Card>
        </aside>
      </div>
    </div>
  )
}
