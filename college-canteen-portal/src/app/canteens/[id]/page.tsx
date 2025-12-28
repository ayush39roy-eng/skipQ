"use client"
import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Stepper } from '@/components/ui/Stepper'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Loader } from '@/components/ui/Loader'
import { MobileCartPill } from './_components/MobileCartPill'

type Item = { id: string; name: string; priceCents: number; imageUrl?: string | null; description?: string | null; sectionId?: string | null; sortOrder?: number; available?: boolean }
type Section = { id: string; name: string }

function CanteenMenuContent() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<Item[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [canteen, setCanteen] = useState<{ id: string; name: string; imageUrl?: string | null } | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [q, setQ] = useState('')
  const [fulfillmentType, setFulfillmentType] = useState<'TAKEAWAY' | 'DINE_IN'>('DINE_IN')
  const [sortMode, setSortMode] = useState<'popular' | 'price'>('popular')
  const [cartRestored, setCartRestored] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [cookingInstruction, setCookingInstruction] = useState('')
  const sectionsScrollerRef = useRef<HTMLDivElement | null>(null)
  const sectionsInnerRef = useRef<HTMLDivElement | null>(null)
  const sectionsScrollbarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch(`/api/menu/${id}`).then(r => r.json()).then(data => {
      setItems(data.items || [])
      setSections(data.sections || [])
      setCanteen(data.canteen || null)
    })
  }, [id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem('skipq-pending-cart')
    if (!raw) return
    try {
      const payload = JSON.parse(raw) as {
        canteenId: string
        cart: Record<string, number>
        fulfillmentType?: 'TAKEAWAY' | 'DINE_IN'
        cookingInstruction?: string
        savedAt?: number
      }
      if (!payload || payload.canteenId !== id) return
      if (payload.savedAt && Date.now() - payload.savedAt > 1000 * 60 * 60) {
        window.localStorage.removeItem('skipq-pending-cart')
        return
      }
      setCart(payload.cart ?? {})
      if (payload.fulfillmentType === 'DINE_IN') {
        setFulfillmentType('DINE_IN')
      }
      if (payload.cookingInstruction) setCookingInstruction(payload.cookingInstruction)
      setCartRestored(true)
      window.localStorage.removeItem('skipq-pending-cart')
    } catch {
      window.localStorage.removeItem('skipq-pending-cart')
    }
  }, [id])

  const filtered = useMemo(() => {
    if (!Array.isArray(items)) return []
    const query = q.trim().toLowerCase()
    let base = items
    if (selectedSection !== 'all') {
      base = base.filter((it) => it.sectionId === selectedSection)
    }
    if (query) {
      base = base.filter((it) =>
        it.name.toLowerCase().includes(query) ||
        (it.description || '').toLowerCase().includes(query)
      )
    }
    const sorted = [...base]
    if (sortMode === 'price') {
      sorted.sort((a, b) => a.priceCents - b.priceCents)
    } else {
      sorted.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    }
    return sorted
  }, [items, q, sortMode, selectedSection])

  const heroImage = useMemo(() => {
    if (canteen?.imageUrl) return canteen.imageUrl
    if (!Array.isArray(items)) return '/placeholder.svg'
    return items.find((it) => it.imageUrl)?.imageUrl || '/placeholder.svg'
  }, [items, canteen])

  const priceStats = useMemo(() => {
    if (!Array.isArray(items) || !items.length) return { avg: '0.00', min: '0.00', max: '0.00' }
    const cents = items.map((it) => it.priceCents)
    const avg = (cents.reduce((sum, val) => sum + val, 0) / items.length / 100).toFixed(2)
    const min = (Math.min(...cents) / 100).toFixed(2)
    const max = (Math.max(...cents) / 100).toFixed(2)
    return { avg, min, max }
  }, [items])

  useEffect(() => {
    const scroller = sectionsScrollerRef.current
    const scrollbar = sectionsScrollbarRef.current
    const inner = sectionsInnerRef.current
    if (!scroller || !scrollbar || !inner) return

    // keep a small spacer inside the visible scrollbar so it shows a track proportional to content
    const spacer = scrollbar.firstElementChild as HTMLElement | null
    const updateSpacer = () => {
      if (!spacer) return
      spacer.style.width = `${inner.scrollWidth}px`
    }

    // sync scrolling both ways
    const onScrollerScroll = () => { if (scrollbar) scrollbar.scrollLeft = scroller.scrollLeft }
    const onScrollbarScroll = () => { if (scroller) scroller.scrollLeft = scrollbar.scrollLeft }

    scroller.addEventListener('scroll', onScrollerScroll)
    scrollbar.addEventListener('scroll', onScrollbarScroll)

    // observe size changes to adjust spacer width
    const ro = new ResizeObserver(updateSpacer)
    ro.observe(inner)
    // initial
    updateSpacer()

    return () => {
      scroller.removeEventListener('scroll', onScrollerScroll)
      scrollbar.removeEventListener('scroll', onScrollbarScroll)
      ro.disconnect()
    }
  }, [sections])

  // quickFilters removed — keep only sort buttons (Chef picks / Lowest price)
  const fulfillmentOptions: { label: string, value: 'TAKEAWAY' | 'DINE_IN', description: string }[] = useMemo(() => ([
    { label: 'Dine-in', value: 'DINE_IN', description: 'Enjoy at the seating area' },
    { label: 'Takeaway', value: 'TAKEAWAY', description: 'Grab & go from the counter' }
  ]), [])

  const subtotalCents = Array.isArray(items) ? items.reduce((acc, it) => acc + (cart[it.id] ?? 0) * it.priceCents, 0) : 0
  const platformFeeCents = Math.round(subtotalCents * 0.05)
  const grandTotalCents = subtotalCents + platformFeeCents

  const persistCartForLogin = useCallback(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('skipq-pending-cart', JSON.stringify({
      canteenId: id,
      cart,
      fulfillmentType,
      cookingInstruction,
      savedAt: Date.now(),
    }))
  }, [cart, fulfillmentType, id, cookingInstruction])

  const order = async () => {
    const orderItems = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity }))
    if (orderItems.length === 0) return

    setIsCheckingOut(true)
    const payload = { canteenId: id, items: orderItems, fulfillmentType, cookingInstructions: cookingInstruction }
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (res.status === 401) {
      persistCartForLogin()
      const nextPath = `/canteens/${id}?resume=1`
      const redirectTarget = `/register?next=${encodeURIComponent(nextPath)}`
      // Keep loading during redirect (take user to signup so they return to resume path)
      window.location.href = redirectTarget
      return
    }
    const data = await res.json().catch(() => ({}))
    if (res.ok && data?.id) {
      // Keep loading during redirect
      window.location.href = `/pay/${data.id}`
      return
    }
    alert(data.error ?? 'Failed to create order')
    setIsCheckingOut(false)
  }

  return (
    <div className="space-y-8">
      <section className="game-card rounded-3xl p-4 sm:p-6">
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-3xl border border-white/10 sm:aspect-[21/6]">
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
            <h1 className="mt-3 text-3xl font-semibold">{canteen?.name || 'Canteen'}</h1>
            <p className="mt-2 text-sm text-white/80">{canteen?.name ? `Order from ${canteen.name} online.` : 'Skip the queue.'}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 text-[rgb(var(--text))] sm:grid-cols-3">
          <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_#000000]">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-bold">Menu size</p>
            <p className="mt-2 text-3xl font-black">{items.length}</p>
            <p className="text-sm text-gray-600 font-semibold">Curated dishes live now</p>
          </div>
          <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_#000000]">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-bold">Average</p>
            <p className="mt-2 text-3xl font-black">₹{priceStats.avg}</p>
            <p className="text-sm text-gray-600 font-semibold">Typical item cost</p>
          </div>
          <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_#000000]">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 font-bold">Range</p>
            <p className="mt-2 text-3xl font-black">₹{priceStats.min} – ₹{priceStats.max}</p>
            <p className="text-sm text-gray-600 font-semibold">Budget to indulgent</p>
          </div>
        </div>
        {/* Quick filters removed — only sort buttons are shown below */}
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row">
        <section className="flex-1 min-w-0">
          <div className="game-card rounded-2xl p-4">
            <div className="space-y-1">
              <span className="block text-sm font-bold text-black" style={{ color: 'rgb(var(--text))' }}>Search menu</span>
              <div className="relative rounded-xl shadow-lg transition-shadow hover:shadow-xl">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-5 w-5 text-[rgb(var(--accent))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <Input
                  placeholder="Type “wrap”, “cold coffee”, …"
                  value={q}
                  onChange={(e) => setQ((e.target as HTMLInputElement).value)}
                  className="w-full"
                  inputClassName="border-[rgb(var(--accent))] !pl-10 ring-offset-2 focus:ring-2 focus:ring-[rgb(var(--accent))]"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {(['popular', 'price'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSortMode(mode)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-bold transition border-2 border-black ${sortMode === mode ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                >
                  {mode === 'popular' ? 'Chef picks' : 'Lowest price'}
                </button>
              ))}
            </div>

            {sections.length > 0 && (
              <>
                <div ref={sectionsScrollerRef} className="mt-6 w-full overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide">
                  <div ref={sectionsInnerRef} className="inline-flex items-center gap-2 min-w-max px-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSection('all')}
                      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${selectedSection === 'all' ? 'bg-[rgb(var(--text))] text-[rgb(var(--bg))]' : 'bg-[rgb(var(--surface-muted))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]/80'}`}
                    >
                      All
                    </button>
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setSelectedSection(section.id)}
                        className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${selectedSection === section.id ? 'bg-[rgb(var(--text))] text-[rgb(var(--bg))]' : 'bg-[rgb(var(--surface-muted))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]/80'}`}
                      >
                        {section.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* visible scrollbar synced to the hidden sections scroller */}
                <div ref={sectionsScrollbarRef} className="mt-1 w-full overflow-x-auto">
                  <div style={{ height: 4 }} />
                </div>
              </>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((it) => (
              <div key={it.id} className={`game-card group overflow-hidden rounded-xl transition-all duration-200 p-0 ${!it.available ? 'opacity-60 grayscale' : ''}`}>
                <div className="relative h-48 w-full overflow-hidden rounded-2xl">
                  <Image
                    src={it.imageUrl || '/placeholder.svg'}
                    alt={it.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-contain transition duration-500 group-hover:scale-105 bg-[rgb(var(--surface-muted))] p-2"
                    style={{ objectFit: 'contain', objectPosition: 'center' }}
                  />
                  <div className="absolute left-4 top-4">
                    {it.available ? (
                      <Badge variant="info" className="bg-black/70 text-white backdrop-blur">Best seller</Badge>
                    ) : (
                      <Badge variant="danger" className="bg-red-600/90 text-white backdrop-blur">Sold out</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{it.name}</h3>
                    {it.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{it.description}</p>}
                  </div>
                  <p className="text-right text-base font-semibold">₹{(it.priceCents / 100).toFixed(2)}</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span></span>
                  {!it.available ? (
                    <button className="rounded-lg border-2 border-black bg-gray-200 px-4 py-2 font-bold text-gray-500" disabled>Unavailable</button>
                  ) : (cart[it.id] ?? 0) === 0 ? (
                    <button className="game-btn px-6 py-2 text-xs" onClick={() => setCart((c) => ({ ...c, [it.id]: 1 }))}>Add</button>
                  ) : (
                    <Stepper value={cart[it.id] ?? 0} onChange={(v) => setCart((c) => ({ ...c, [it.id]: v }))} />
                  )}
                </div>
              </div>
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
          <div className="game-card flex flex-col justify-between space-y-4 rounded-xl p-5 self-start">
            {(cartRestored || searchParams.get('resume')) && (
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                Cart restored after login. Review items and checkout to finish payment.
              </div>
            )}
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
            <div className="space-y-4">
              {Object.entries(cart).filter(([, qty]) => qty > 0).map(([itemId, qty]) => {
                const it = items.find((x) => String(x.id) === String(itemId))
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
            <div className="mt-4 border-t border-[rgb(var(--border))] pt-4 text-sm">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span>₹{(subtotalCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between text-muted"><span>Platform fee (5%)</span><span>₹{(platformFeeCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Total</span><span>₹{(grandTotalCents / 100).toFixed(2)}</span></div>
            </div>
            <div className="mt-4">
              <button onClick={order} disabled={subtotalCents <= 0 || isCheckingOut} className="game-btn w-full rounded-xl py-3 text-lg">
                {isCheckingOut ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader size="small" />
                    Processing...
                  </span>
                ) : (
                  'Checkout & Pay'
                )}
              </button>
            </div>
            <div className="mt-3 text-xs text-[rgb(var(--text-muted))]">By checking out you agree to the canteen&apos;s prep time and receive WhatsApp notifications when your order is ready.</div>
          </div>
        </aside>
      </div>
      <MobileCartPill
        items={items}
        cart={cart}
        subtotalCents={subtotalCents}
        platformFeeCents={platformFeeCents}
        grandTotalCents={grandTotalCents}
        fulfillmentType={fulfillmentType}
        setFulfillmentType={setFulfillmentType}
        onCheckout={order}
        onClear={() => setCart({})}
        cartRestored={cartRestored}
        searchParamsResume={!!searchParams.get('resume')}
        isCheckingOut={isCheckingOut}
      />
      {/* debug overlay removed */}
    </div>
  )
}

export default function CanteenMenuPage() {
  return (
    <Suspense fallback={<div className="flex h-[50vh] w-full items-center justify-center"><Loader size="large" /></div>}>
      <CanteenMenuContent />
    </Suspense>
  )
}
