"use client"
import useSWR from 'swr'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
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
            <section className="rounded-3xl border border-[rgb(var(--border))] bg-gradient-to-br from-[rgb(var(--surface))] via-[rgb(var(--surface-muted))] to-[rgb(var(--bg))] p-6 sm:p-10 shadow-[0_25px_60px_rgba(15,15,35,0.35)]">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3 max-w-2xl">
                        <p className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--text-muted))]">Campus network</p>
                        <h1 className="text-3xl font-semibold tracking-tight text-[rgb(var(--text))]">Browse every canteen on SkipQ and jump straight to ready-to-serve menus.</h1>
                        <p className="text-sm text-[rgb(var(--text-muted))]">We spotlight proximity, speed, and signature dishes so you never wait in line again.</p>
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
                                    className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-[rgb(var(--text))] transition hover:border-[rgb(var(--accent))]"
                                >
                                    {loc}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-1 gap-3 text-[rgb(var(--text))] sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Network</p>
                        <p className="mt-2 text-3xl font-semibold">{data.length}</p>
                        <p className="text-sm text-[rgb(var(--text-muted))]">Active canteens on SkipQ</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Coverage</p>
                        <p className="mt-2 text-3xl font-semibold">{campusZones || '—'}</p>
                        <p className="text-sm text-[rgb(var(--text-muted))]">Campus zones served</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--text-muted))]">Avg. wait</p>
                        <p className="mt-2 text-3xl font-semibold">&lt; 5m</p>
                        <p className="text-sm text-[rgb(var(--text-muted))]">Pickup after ordering</p>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => {
                    const status = checkCanteenStatus(c)
                    return (
                        <Link key={c.id} href={`/canteens/${c.id}`} className={`group ${!status.isOpen ? 'opacity-75 grayscale filter' : ''}`}>
                            <Card className="h-full overflow-hidden border-[rgb(var(--border))] transition duration-300 group-hover:border-[rgb(var(--accent))] group-hover:shadow-xl">
                                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[rgb(var(--surface-muted))]">
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
                                        <Badge variant={status.isOpen ? 'success' : 'danger'} className="bg-black/70 text-white backdrop-blur">
                                            {status.message}
                                        </Badge>
                                    </div>
                                </div>
                                    <div className="mt-4 flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-semibold text-[rgb(var(--text))]">{c.name}</h3>
                                        <p className="text-sm text-[rgb(var(--text-muted))]">{c.location ?? 'On campus'}</p>
                                    </div>
                                    <div className="text-right text-xs text-[rgb(var(--text-muted))]">
                                        <p>Prep · {typeof c.prepTimeMinutes === 'number' && c.prepTimeMinutes >= 0 ? `${c.prepTimeMinutes}m` : '≈10m'}</p>
                                        <p>{c.peakHoursStart && c.peakHoursEnd ? `Peak · ${c.peakHoursStart}-${c.peakHoursEnd}` : 'Peak · est. 12-2 PM'}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                    {(c.location?.split(',').slice(-2) || ['Chef-led']).map((tag, idx) => (
                                        <span
                                            key={`${c.id}-${tag}-${idx}`}
                                            className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-[rgb(var(--text-muted))]"
                                        >
                                            {tag.trim() || 'Chef-led'}
                                        </span>
                                    ))}
                                </div>
                                <div className="mt-5 flex items-center justify-between text-sm text-[rgb(var(--text-muted))]">
                                    <span>{status.isOpen ? 'Tap to view menu →' : 'Currently closed'}</span>
                                    {status.isOpen && <span className="font-medium text-[rgb(var(--accent))]">Order now</span>}
                                </div>
                            </Card>
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
