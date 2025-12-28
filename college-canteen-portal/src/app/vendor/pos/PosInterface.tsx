'use client'

import { useState } from 'react'
import { VendorCard } from '@/components/vendor/ui/VendorCard'
import { VendorButton } from '@/components/vendor/ui/VendorButton'
import { VendorInput } from '@/components/vendor/ui/VendorInput'

type MenuItem = {
  id: string
  name: string
  priceCents: number
  section?: { name: string } | null
  imageUrl?: string | null
}

type PosInterfaceProps = {
  initialItems: MenuItem[]
}

type CartItem = MenuItem & {
  quantity: number
}

export default function PosInterface({ initialItems }: PosInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [cart, setCart] = useState<CartItem[]>([])

  // Extract unique categories from items
  const categories = ['All', ...Array.from(new Set(initialItems.map(i => i.section?.name || 'Other')))]

  const filteredItems = initialItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'All' || (item.section?.name || 'Other') === activeCategory
    return matchesSearch && matchesCategory
  })

  // Group items by category for "All" view or flat list?
  // Let's stick to flat grid for simplicity, sorted by popularity (if we had it) or name
  
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(x => x.id === item.id)
      if (existing) {
        return prev.map(x => x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x)
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const adjustQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) }
      }
      return item
    }).filter(x => x.quantity > 0))
  }

  const subtotal = cart.reduce((acc, item) => acc + (item.priceCents * item.quantity), 0)
  const tax = Math.round(subtotal * 0.05)
  const total = subtotal + tax

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-4">
      {/* LEFT SIDE: Menu Grid */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Header Bar */}
        <div className="flex gap-4">
          <VendorInput 
            placeholder="Search items..." 
            className="h-12 text-lg" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-[var(--vendor-text-primary)] text-[var(--vendor-bg)]'
                  : 'bg-[var(--vendor-surface)] text-[var(--vendor-text-secondary)] hover:bg-[var(--vendor-border)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto pb-20 sm:grid-cols-3 lg:grid-cols-4 pr-2 content-start">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="group relative flex flex-col justify-between rounded-xl border border-[var(--vendor-border)] bg-[var(--vendor-surface)] p-4 text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md hover:border-[var(--vendor-accent)]"
            >
              <div className="font-semibold text-[var(--vendor-text-primary)] line-clamp-2">{item.name}</div>
              <div className="mt-2 text-sm font-medium opacity-80 text-[var(--vendor-text-secondary)]">₹{(item.priceCents / 100).toFixed(2)}</div>
            </button>
          ))}
          {filteredItems.length === 0 && (
             <div className="col-span-full py-12 text-center text-[var(--vendor-text-secondary)]">
                No items found.
             </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Cart */}
      <VendorCard className="flex w-[400px] flex-col p-4 border-l border-[var(--vendor-border)] shadow-lg z-10">
        <div className="mb-4 flex items-center justify-between border-b border-[var(--vendor-border)] pb-4">
          <h2 className="text-xl font-bold">Current Order</h2>
          <VendorButton variant="ghost" size="sm" onClick={() => setCart([])}>Clear</VendorButton>
        </div>

        {/* Cart Items */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-[var(--vendor-text-secondary)]">
              <span className="text-4xl text-[var(--vendor-border)] mb-4">🛒</span>
              <p>Cart is empty</p>
              <p className="text-xs mt-1">Select items from the left to start.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-[var(--vendor-bg)]">
                <div>
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-[var(--vendor-text-secondary)]">₹{(item.priceCents / 100).toFixed(2)} x {item.quantity}</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => adjustQty(item.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--vendor-border)] hover:bg-[var(--vendor-surface)]">-</button>
                  <span className="w-4 text-center font-medium text-sm">{item.quantity}</span>
                  <button onClick={() => adjustQty(item.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--vendor-border)] hover:bg-[var(--vendor-surface)]">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="mt-4 border-t border-[var(--vendor-border)] pt-4 space-y-2 bg-[var(--vendor-surface-muted)] -mx-4 -mb-4 p-4">
          <div className="flex justify-between text-sm text-[var(--vendor-text-secondary)]">
            <span>Subtotal</span>
            <span>₹{(subtotal / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-[var(--vendor-text-secondary)]">
            <span>Tax (5%)</span>
            <span>₹{(tax / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-[var(--vendor-text-primary)]">
            <span>Total</span>
            <span>₹{(total / 100).toFixed(2)}</span>
          </div>
          
           {/* Actions */}
            <div className="mt-4 grid grid-cols-2 gap-3">
            <VendorButton variant="secondary" className="w-full">Hold</VendorButton>
            <VendorButton variant="primary" className="w-full" disabled={cart.length === 0}>
                Pay ₹{(total / 100).toFixed(0)}
            </VendorButton>
            </div>
        </div>
      </VendorCard>
    </div>
  )
}
