"use client"
import useSWR from 'swr'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

type CanteenSummary = {
  id: string
  name: string
  location?: string | null
  imageUrl?: string | null
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Request failed')
  return res.json()
}

export default function CanteensPage() {
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

  if (error) return <p>Failed to load.</p>
  if (!data) return <div className="space-y-3"><div className="h-8 w-40 skeleton" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:6}).map((_,i)=>(<div key={i} className="card h-48 skeleton" />))}</div></div>

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Canteens & Eateries</h1>
        <div className="w-full sm:w-80">
          <Input label="Search" placeholder="Find a canteen..." value={q} onChange={e=>setQ((e.target as HTMLInputElement).value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <Card key={c.id} className="transition-all hover:border-[rgb(var(--accent))]/70 hover:shadow-md">
            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-[rgb(var(--surface-muted))]">
              <Image src={c.imageUrl || '/placeholder.svg'} alt="Canteen cover" fill priority={false} sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            </div>
            <div className="mt-4 space-y-1">
              <h3 className="text-lg font-semibold">{c.name}</h3>
              <p className="text-sm text-muted">{c.location ?? 'On campus'}</p>
            </div>
            <div className="mt-4">
              <Link href={`/canteens/${c.id}`} className="btn block w-full text-center">View Menu</Link>
            </div>
          </Card>
        ))}
        {list.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted">No canteens match “{q}”.</div>
        )}
      </div>
    </main>
  )
}
