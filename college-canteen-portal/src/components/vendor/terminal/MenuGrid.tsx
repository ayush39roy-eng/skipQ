'use client'

import { useMemo } from 'react'
import { VendorItem } from '@/types/vendor'

interface MenuGridProps {
  items: VendorItem[]
  searchQuery: string
  selectedCategory: string
  onSearchChange: (query: string) => void
  onCategorySelect: (category: string) => void
  onItemClick: (item: VendorItem) => void
}

export function MenuGrid({ 
  items, 
  searchQuery, 
  selectedCategory, 
  onSearchChange, 
  onCategorySelect,
  onItemClick 
}: MenuGridProps) {
  
  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.section || 'Other'))
    return ['All', ...Array.from(cats)].filter(Boolean) as string[]
  }, [items])

  const filteredItems = useMemo(() => 
    items.filter(i => {
      const matchSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCat = selectedCategory === 'All' || (i.section || 'Other') === selectedCategory
      return matchSearch && matchCat
    }),
    [items, searchQuery, selectedCategory]
  )

  return (
    <div className="flex flex-1 flex-col h-full bg-vendor-bg relative overflow-hidden">
       {/* Search & Header */}
       <div className="px-6 pt-6 pb-2 shrink-0">
          <div className="relative">
             <input 
               type="search"
               aria-label="Search menu items"
               className="w-full bg-white border border-vendor-border rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-vendor-accent-soft focus:border-vendor-accent transition-all placeholder:text-vendor-text-secondary font-medium shadow-sm text-vendor-text-primary"
               placeholder="Search menu items..."
               value={searchQuery}
               onChange={(e) => onSearchChange(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-vendor-text-secondary absolute left-4 top-1/2 -translate-y-1/2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
       </div>

       {/* Category Pills (Top) */}
       <div className="px-6 py-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex gap-2">
             {categories.map(cat => (
                <button
                   key={cat}
                   onClick={() => onCategorySelect(cat)}
                   className={`px-5 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap border ${
                      selectedCategory === cat 
                        ? 'bg-vendor-accent text-white border-vendor-accent shadow-sm' 
                        : 'bg-white text-vendor-text-secondary border-vendor-border hover:border-vendor-accent hover:text-vendor-accent'
                   }`}
                >
                   {cat}
                </button>
             ))}
          </div>
       </div>

       {/* Grid Area */}
       <div className="flex-1 overflow-y-auto p-6 place-content-start">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
             {filteredItems.map(item => (
                <div
                   key={item.id}
                   className={`
                     relative group flex flex-col justify-between 
                     bg-white border text-left rounded-2xl p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-1
                     ${!item.available ? 'opacity-60 grayscale border-vendor-border' : 'border-vendor-border hover:border-vendor-accent'}
                   `}
                >
                   {/* Placeholder Image Area */}
                   <div className="w-full aspect-[4/3] bg-vendor-bg rounded-xl mb-3 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center text-vendor-text-secondary opacity-30">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                      </div>
                      {item.isVegetarian !== undefined && (
                         <div className="absolute top-2 right-2 bg-white/90 rounded p-1 shadow-sm">
                            <div className={`h-3 w-3 rounded-sm border ${item.isVegetarian ? 'border-green-600' : 'border-red-600'} p-[1.5px] flex items-center justify-center`}>
                                <div className={`h-1.5 w-1.5 rounded-full ${item.isVegetarian ? 'bg-green-600' : 'bg-red-600'}`}></div>
                            </div>
                         </div>
                      )}
                   </div>

                   <div>
                      <h3 className="font-bold text-vendor-text-primary text-sm leading-tight line-clamp-2 h-10">{item.name}</h3>
                      
                      <div className="flex justify-between items-center mt-3">
                         <span className="text-sm font-bold text-vendor-text-primary">₹{(item.priceCents / 100).toFixed(2)}</span>
                         
                         <button
                            onClick={() => onItemClick(item)}
                            disabled={!item.available}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-colors ${
                              item.available
                                ? 'bg-vendor-accent-soft text-vendor-accent hover:bg-vendor-accent hover:text-white'
                                : 'bg-vendor-bg text-vendor-text-secondary'
                            }`}
                         >
                            {item.available ? 'ADD' : 'SOLD'}
                         </button>
                      </div>
                   </div>
                </div>
             ))}
          </div>
       </div>
    </div>
  )
}
