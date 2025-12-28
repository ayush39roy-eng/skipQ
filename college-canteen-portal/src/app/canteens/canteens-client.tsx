"use client"
import useSWR from 'swr'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

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

    const campusZones = useMemo(() => {
        if (!data) return 0
        const zones = new Set(
            data
                .map((c) => (c.location || '').split(',').pop()?.trim())
                .filter(Boolean)
        )
        return zones.size
    }, [data])

    const topLocations = useMemo(() => {
        if (!data) return [] as string[]
        const ordered = Array.from(new Set(data.map((c) => c.location || 'On campus')))
        return ordered.slice(0, 4)
    }, [data])

    if (error) return <p>Failed to load.</p>
    if (!data) {
        return (
            <div className="space-y-6">
                <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6">
                    <div className="h-10 w-64 skeleton" />
                    <div className="mt-3 h-4 w-80 skeleton" />
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-[rgb(var(--border))] p-4">
                                <div className="h-4 w-16 skeleton" />
                                <div className="mt-2 h-8 w-32 skeleton" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="card h-64 skeleton" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <main className="space-y-8">
            <section className="game-card rounded-3xl p-5 sm:p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2 max-w-2xl">
                        <h1 className="text-3xl font-semibold tracking-tight text-[rgb(var(--text))]">Find your food. Skip the queue.</h1>
                        <p className="text-sm text-[rgb(var(--text-muted))]">Order from any campus outlet instantly.</p>
                    </div>
                    <div className="w-full max-w-md">
                        <Input
                            label="Search"
                            placeholder="Search by name, block, or floor..."
                            value={q}
                            onChange={(e) => setQ((e.target as HTMLInputElement).value)}
                        />
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[rgb(var(--text-muted))]">
                            {topLocations.map((loc) => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => setQ(loc)}
                                    className="rounded-lg border-2 border-[rgb(var(--text))] px-3 py-1 text-[rgb(var(--text))] font-bold transition hover:bg-[rgb(var(--text))] hover:text-[rgb(var(--surface))]"
                                >
                                    {loc}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 text-[rgb(var(--text))] sm:grid-cols-3">
                    <div className="rounded-2xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-[2px_2px_0px_0px_rgb(var(--border))]">
                        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))] font-bold">Network</p>
                        <p className="mt-1 text-2xl font-black">{data.length}</p>
                        <p className="text-xs text-[rgb(var(--text-muted))] font-semibold">Active canteens</p>
                    </div>
                    <div className="rounded-2xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-[2px_2px_0px_0px_rgb(var(--border))]">
                        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))] font-bold">Coverage</p>
                        <p className="mt-1 text-2xl font-black">{campusZones || '—'}</p>
                        <p className="text-xs text-[rgb(var(--text-muted))] font-semibold">Campus zones</p>
                    </div>
                    <div className="rounded-2xl border-2 border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-[2px_2px_0px_0px_rgb(var(--border))]">
                        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))] font-bold">Avg. wait</p>
                        <p className="mt-1 text-2xl font-black">&lt; 5m</p>
                        <p className="text-xs text-[rgb(var(--text-muted))] font-semibold">Pickup time</p>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => {
                    const status = checkCanteenStatus(c)
                    return (
                        <Link key={c.id} href={`/canteens/${c.id}`} className={`group block ${!status.isOpen ? 'opacity-75 grayscale filter' : ''}`}>
                            <div className="game-card h-full overflow-hidden rounded-xl transition duration-300 p-0">
                                <div className="relative aspect-[4/3] w-full overflow-hidden border-b-2 border-black bg-[rgb(var(--surface-muted))]">
                                    <Image
                                        src={c.imageUrl || '/placeholder.svg'}
                                        alt="Canteen cover"
                                        fill
                                        priority={false}
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                        className="object-cover transition duration-500 group-hover:scale-105"
                                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                                    />
                                    <div className="absolute left-4 top-4">
                                        <Badge variant={status.isOpen ? 'success' : 'danger'} className="bg-black text-white border-2 border-black shadow-[2px_2px_0px_0px_#ffffff]">
                                            {status.message}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-start justify-between gap-3 px-5 pb-2">
                                    <div>
                                        <h3 className="text-lg font-black text-black">{c.name}</h3>
                                        <p className="text-sm font-semibold text-gray-600">{c.location ?? 'On campus'}</p>
                                    </div>
                                    <div className="text-right text-xs font-bold text-gray-500">
                                        <p>Prep · {typeof c.prepTimeMinutes === 'number' && c.prepTimeMinutes >= 0 ? `${c.prepTimeMinutes}m` : '≈10m'}</p>
                                        <p>{c.peakHoursStart && c.peakHoursEnd ? `Peak · ${c.peakHoursStart}-${c.peakHoursEnd}` : 'Peak · est. 12-2 PM'}</p>
                                    </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs px-5">
                                    {(c.location?.split(',').slice(-2) || ['Chef-led']).map((tag, idx) => (
                                        <span
                                            key={`${c.id}-${tag}-${idx}`}
                                            className="rounded-lg border-2 border-black px-3 py-1 font-bold text-black"
                                        >
                                            {tag.trim() || 'Chef-led'}
                                        </span>
                                    ))}
                                </div>
                                <div className="mt-5 flex items-center justify-between text-sm font-bold text-gray-600 px-5 pb-5">
                                    <span>{status.isOpen ? 'Tap to view menu →' : 'Currently closed'}</span>
                                    {status.isOpen && <span className="game-btn px-3 py-1 text-xs">Order now</span>}
                                </div>
                            </div>
                        </Link>
                    )
                })}
                {list.length === 0 && (
                    <div className="col-span-full rounded-2xl border border-dashed border-[rgb(var(--border))] p-12 text-center">
                        <p className="text-lg font-semibold text-[rgb(var(--text))]">No canteens match “{q}”.</p>
                        <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Try searching by building name, block, or floor.</p>
                    </div>
                )}
            </div>
        </main>
    )
}
