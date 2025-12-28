"use client"
import useSWR from 'swr'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Search, Loader2 } from 'lucide-react'

import { checkCanteenStatus } from '@/lib/canteen-utils'

type CanteenSummary = {
    id: string
    name: string
    location?: string | null
    imageUrl?: string | null
    openingTime: string | null
    closingTime: string | null
    autoMode: boolean
    manualIsOpen: boolean
    prepTimeMinutes?: number | null
    peakHoursStart?: string | null
    peakHoursEnd?: string | null
}

const fetcher = async <T,>(url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Request failed')
    return res.json()
}

export default function CanteensClient() {
    const { data, error } = useSWR<CanteenSummary[]>('/api/canteens', (url: string) => fetcher<CanteenSummary[]>(url))
    const [q, setQ] = useState('')

    const list = useMemo(() => {
        if (!data) return [] as CanteenSummary[]
        const query = q.trim().toLowerCase()
        if (!query) return data
        return data.filter((c) =>
            c.name.toLowerCase().includes(query) ||
            (c.location?.toLowerCase() || '').includes(query)
        )
    }, [data, q])

    const topLocations = useMemo(() => {
        if (!data) return [] as string[]
        const ordered = Array.from(new Set(data.map((c) => c.location || 'Central')))
        return ordered.slice(0, 4)
    }, [data])

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
             <div className="text-4xl">👾</div>
            <p className="text-2xl font-black uppercase">System Error</p>
            <p className="border-2 border-black p-2 bg-red-100 font-bold">Failed to load canteen network.</p>
        </div>
    )

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                 <Loader2 className="w-16 h-16 animate-spin text-black" />
            </div>
        )
    }

    return (
        <main className="space-y-12 pb-20">
            {/* Header / Search Section */}
            <section className="space-y-8">
                <div className="space-y-2">
                     <div className="inline-block bg-black text-white px-4 py-1 text-sm font-black uppercase tracking-[0.2em] transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                        Map Select
                     </div>
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none stroke-black text-black drop-shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
                        Select Your <span className="text-[#FF9F1C] text-stroke-2">Kitchen</span>
                    </h1>
                </div>

                <div className="bg-white border-4 border-black p-6 rounded-2xl shadow-[8px_8px_0px_0px_#000000] space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-black" strokeWidth={3} />
                        <input 
                            type="text"
                            placeholder="SEARCH OUTLETS..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="w-full bg-[#FFF8F0] border-2 border-black rounded-xl py-4 pl-14 pr-4 font-bold uppercase placeholder:text-slate-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_#000000] focus:bg-white transition-all"
                        />
                    </div>
                    
                    {topLocations.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-black uppercase tracking-wider mr-2">Quick Filters:</span>
                            {topLocations.map((loc) => (
                                <button
                                    key={loc}
                                    onClick={() => setQ(loc)}
                                    className="px-3 py-1 bg-white border-2 border-black rounded-lg text-xs font-bold uppercase shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:bg-black active:text-white transition-all"
                                >
                                    {loc}
                                </button>
                            ))}
                            {q && (
                                <button 
                                    onClick={() => setQ('')}
                                    className="px-3 py-1 bg-[#EF476F] text-white border-2 border-black rounded-lg text-xs font-bold uppercase shadow-[2px_2px_0px_0px_#000000] hover:shadow-none"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Canteen Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {list.map((c) => {
                    const status = checkCanteenStatus(c)
                    return (
                        <Link key={c.id} href={`/canteens/${c.id}`} className={`group block relative ${!status.isOpen ? 'grayscale-[0.8] opacity-90' : ''}`}>
                            <div className="h-full bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_#000000] transition-all group-hover:translate-x-[4px] group-hover:translate-y-[4px] group-hover:shadow-[4px_4px_0px_0px_#000000] flex flex-col">
                                
                                {/* Image Container */}
                                <div className="relative aspect-[4/3] w-full border-b-4 border-black bg-slate-100">
                                    <Image
                                        src={c.imageUrl || '/placeholder.svg'}
                                        alt={c.name}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute top-4 right-4">
                                        <div className={`px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] font-black uppercase text-xs tracking-wider ${
                                            status.isOpen ? 'bg-[#06D6A0] text-black' : 'bg-[#EF476F] text-white'
                                        }`}>
                                            {status.isOpen ? 'OPEN' : 'CLOSED'}
                                        </div>
                                    </div>
                                    
                                    {/* Prep Time Tag */}
                                    <div className="absolute bottom-4 left-4">
                                         <div className="px-2 py-1 bg-white border-2 border-black text-xs font-bold shadow-[2px_2px_0px_0px_#000]">
                                            ⏱ PREP: {c.prepTimeMinutes ? `${c.prepTimeMinutes}m` : '~10m'}
                                         </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 flex flex-col flex-1 gap-4">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase leading-tight group-hover:underline decoration-2 underline-offset-4">{c.name}</h3>
                                        <p className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                                            <span>📍 {c.location || 'Campus'}</span>
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-4 border-t-2 border-dashed border-gray-300">
                                         <button className="w-full py-3 bg-[#FFD166] border-2 border-black font-black uppercase tracking-widest text-sm shadow-[2px_2px_0px_0px_#000] group-hover:bg-[#FF9F1C] group-hover:text-white transition-colors">
                                            {status.isOpen ? 'Enter Shop' : 'View Menu'}
                                         </button>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>

            {list.length === 0 && (
                <div className="text-center py-20 border-4 border-black border-dashed rounded-3xl bg-white/50">
                    <p className="text-4xl mb-2">🔭</p>
                    <h3 className="text-xl font-black uppercase">No Kitchens Found</h3>
                    <p className="font-bold text-slate-500">Try searching for a different zone.</p>
                </div>
            )}
        </main>
    )
}
