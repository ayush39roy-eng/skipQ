"use client"
import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Stepper } from '@/components/ui/Stepper'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Loader } from '@/components/ui/Loader'
import { MobileCartPill } from './_components/MobileCartPill'
import Link from 'next/link'
import { ArrowLeft, Search, Plus, Minus, ShoppingBag } from 'lucide-react'

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

    const ro = new ResizeObserver(updateSpacer)
    ro.observe(inner)
    updateSpacer()

    return () => {
      scroller.removeEventListener('scroll', onScrollerScroll)
      scrollbar.removeEventListener('scroll', onScrollbarScroll)
      ro.disconnect()
    }
  }, [sections])

  const fulfillmentOptions: { label: string, value: 'TAKEAWAY' | 'DINE_IN' }[] = useMemo(() => ([
    { label: 'Dine-in', value: 'DINE_IN' },
    { label: 'Takeaway', value: 'TAKEAWAY' }
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
      headers: { 
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(payload)
    })
    if (res.status === 401) {
      persistCartForLogin()
      const nextPath = `/canteens/${id}?resume=1`
      const redirectTarget = `/register?next=${encodeURIComponent(nextPath)}`
      window.location.href = redirectTarget
      return
    }
    const data = await res.json().catch(() => ({}))
    if (res.ok && data?.id) {
      window.location.href = `/pay/${data.id}`
      return
    }
    alert(data.error ?? 'Failed to create order')
    setIsCheckingOut(false)
  }

  const handleCartAdjustment = (itemId: string, delta: number) => {
    setCart((prev) => {
        const current = prev[itemId] || 0;
        const next = Math.max(0, current + delta);
        return { ...prev, [itemId]: next };
    });
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Back & Title */}
      <div className="flex flex-col gap-4">
          <Link href="/canteens" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wider hover:underline w-fit">
             <ArrowLeft className="w-4 h-4" /> Back to Map
          </Link>
          <div className="relative h-64 md:h-80 w-full rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_#000] overflow-hidden group">
               <Image
                src={heroImage}
                alt="Canteen Hero"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
               <div className="absolute bottom-0 left-0 p-8 w-full">
                    <div className="inline-block bg-[#FF9F1C] text-black px-4 py-1 mb-4 text-xs font-black uppercase tracking-widest border-2 border-black transform -rotate-1">
                        Level 1: {canteen?.name}
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black uppercase text-white leading-none drop-shadow-[4px_4px_0px_#000]">
                        {canteen?.name}
                    </h1>
               </div>
          </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Menu Section */}
        <div className="flex-1 space-y-6">
            
            {/* Search & Sort */}
            <div className="bg-white border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_#000] space-y-4">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black" />
                    <input 
                        className="w-full bg-[#FFF8F0] border-2 border-black rounded-lg py-3 pl-12 pr-4 font-bold uppercase placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all text-sm"
                        placeholder="Search Inventory..."
                        value={q}
                        onChange={e => setQ(e.target.value)}
                    />
                 </div>
                 
                 {/* Categories */}
                 <div className="flex flex-wrap gap-2">
                     <button 
                        onClick={() => setSelectedSection('all')}
                        className={`px-3 py-1 border-2 border-black rounded-lg text-xs font-black uppercase transition-all ${selectedSection === 'all' ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]' : 'bg-white hover:bg-slate-50'}`}
                     >
                        ALL
                     </button>
                     {sections.map(s => (
                        <button 
                            key={s.id}
                            onClick={() => setSelectedSection(s.id)}
                            className={`px-3 py-1 border-2 border-black rounded-lg text-xs font-black uppercase transition-all ${selectedSection === s.id ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]' : 'bg-white hover:bg-slate-50'}`}
                        >
                            {s.name}
                        </button>
                     ))}
                 </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(item => (
                    <div key={item.id} className={`bg-white border-2 border-black rounded-xl p-0 shadow-[4px_4px_0px_0px_#000] flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] ${!item.available ? 'opacity-60 grayscale' : ''}`}>
                         <div className="relative h-48 w-full border-b-2 border-black">
                            <Image src={item.imageUrl || '/placeholder.svg'} alt={item.name} fill className="object-cover" />
                            {!item.available && (
                                <div className="absolute top-2 right-2 bg-red-500 text-white font-black text-xs px-2 py-1 border-2 border-black transform rotate-2">
                                    SOLD OUT
                                </div>
                            )}
                         </div>
                         <div className="p-4 flex flex-col flex-1">
                             <div className="flex justify-between items-start mb-2">
                                 <h3 className="font-black uppercase text-lg leading-tight">{item.name}</h3>
                                 <span className="font-bold whitespace-nowrap bg-[#FFD166] px-2 py-1 border-2 border-black text-xs rounded-md shadow-[2px_2px_0px_0px_#000]">
                                     ₹{(item.priceCents/100)}
                                 </span>
                             </div>
                             <p className="text-xs text-slate-500 font-medium mb-4 line-clamp-2">{item.description}</p>
                             
                             <div className="mt-auto flex items-center justify-between pt-4 border-t-2 border-dashed border-slate-200">
                                 {cart[item.id] ? (
                                     <div className="flex items-center gap-2 bg-[#FFF8F0] border-2 border-black rounded-lg p-1">
                                          <button onClick={() => handleCartAdjustment(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white border-2 border-black rounded hover:bg-red-100 active:translate-y-[1px]">
                                              <Minus className="w-4 h-4" />
                                          </button>
                                          <span className="font-black w-6 text-center">{cart[item.id]}</span>
                                          <button onClick={() => handleCartAdjustment(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white border-2 border-black rounded hover:bg-green-100 active:translate-y-[1px]">
                                              <Plus className="w-4 h-4" />
                                          </button>
                                     </div>
                                 ) : (
                                     <button 
                                        disabled={!item.available}
                                        onClick={() => handleCartAdjustment(item.id, 1)}
                                        className="w-full py-2 bg-black text-white font-black uppercase tracking-wider text-xs border-2 border-black rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-[2px] transition-all"
                                     >
                                         {item.available ? 'Add To Cart' : 'Unavailable'}
                                     </button>
                                 )}
                             </div>
                         </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="p-12 text-center border-4 border-black border-dashed rounded-2xl opacity-50">
                    <p className="font-black uppercase text-xl">No Loot Found</p>
                </div>
            )}
        </div>

        {/* Desktop Cart */}
        <div className="hidden lg:block w-96 space-y-6">
             <div className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_#000] p-6 sticky top-24">
                 <div className="flex items-center gap-2 mb-6 border-b-4 border-black pb-4">
                     <ShoppingBag className="w-6 h-6" />
                     <h2 className="font-black uppercase text-xl">Loot Bag</h2>
                 </div>

                 {Object.keys(cart).length === 0 ? (
                     <div className="text-center py-8 text-slate-400">
                         <p className="text-sm font-bold uppercase">Bag Empty</p>
                         <p className="text-xs">Add items to start quest.</p>
                     </div>
                 ) : (
                     <div className="space-y-4">
                         
                         {/* Items */}
                         <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                             {items.filter(i => cart[i.id]).map(item => (
                                 <div key={item.id} className="flex justify-between items-center text-sm">
                                     <div className="flex items-center gap-2">
                                         <span className="font-black bg-black text-white px-2 rounded-md text-xs">{cart[item.id]}x</span>
                                         <span className="font-bold truncate max-w-[140px] uppercase">{item.name}</span>
                                     </div>
                                     <span className="font-bold">₹{(item.priceCents * cart[item.id] / 100)}</span>
                                 </div>
                             ))}
                         </div>

                         <div className="border-t-4 border-black my-4"></div>

                         {/* Mode */}
                         <div className="grid grid-cols-2 gap-2">
                             {fulfillmentOptions.map(opt => (
                                 <button
                                    key={opt.value}
                                    onClick={() => setFulfillmentType(opt.value)}
                                    className={`py-2 text-xs font-black uppercase border-2 border-black rounded-lg transition-all ${fulfillmentType === opt.value ? 'bg-[#06D6A0] shadow-[2px_2px_0px_0px_#000]' : 'opacity-50 hover:opacity-100'}`}
                                 >
                                     {opt.label}
                                 </button>
                             ))}
                         </div>

                         {/* Totals */}
                         <div className="bg-[#FFF8F0] p-4 border-2 border-black rounded-xl space-y-2">
                             <div className="flex justify-between text-xs font-bold text-slate-500">
                                 <span>Subtotal</span>
                                 <span>₹{subtotalCents/100}</span>
                             </div>
                             <div className="flex justify-between text-2xl font-black text-black">
                                 <span className="uppercase">Total</span>
                                 <span>₹{grandTotalCents/100}</span>
                             </div>
                         </div>

                         <button 
                             onClick={order}
                             disabled={isCheckingOut}
                             className="w-full py-4 bg-[#FF9F1C] border-4 border-black font-black uppercase text-xl rounded-xl shadow-[4px_4px_0px_0px_#000] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2"
                         >
                             {isCheckingOut ? <Loader size="small" /> : 'Review Order'}
                         </button>
                     </div>
                 )}
             </div>
        </div>
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
