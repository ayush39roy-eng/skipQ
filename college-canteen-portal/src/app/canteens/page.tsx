"use client"
import useSWR from 'swr'
import Link from 'next/link'
import { useMemo, useState } from 'react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function CanteensPage() {
  const { data, error } = useSWR('/api/canteens', fetcher)
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    if (!data) return []
    const query = q.trim().toLowerCase()
    if (!query) return data
    return data.filter((c: any) =>
      c.name.toLowerCase().includes(query) ||
      (c.location?.toLowerCase() || '').includes(query)
    )
  }, [data, q])

  if (error) return <p>Failed to load.</p>
  if (!data) return <div className="space-y-3"><div className="h-8 w-40 skeleton" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:6}).map((_,i)=>(<div key={i} className="card h-48 skeleton" />))}</div></div>

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <main className="mt-8 space-y-6">
          <div className="flex flex-wrap justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Canteens & Eateries</h1>
          </div>

          <div className="">
            <label className="block">
              <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500">
                <span className="text-blue-400">🔎</span>
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search for your favorite canteen..." className="w-full bg-transparent outline-none placeholder:text-gray-500" />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c: any) => (
              <div key={c.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4 transition-all hover:border-blue-500/60 hover:shadow-2xl hover:shadow-blue-500/10">
                <div className="aspect-video w-full rounded-lg bg-gray-800/60" />
                <div className="mt-4 space-y-1">
                  <h3 className="text-lg font-semibold text-white">{c.name}</h3>
                  <p className="text-sm text-gray-400">{c.location ?? 'On campus'}</p>
                </div>
                <Link className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500" href={`/canteens/${c.id}`}>
                  View Menu
                </Link>
              </div>
            ))}
            {list.length === 0 && (
              <div className="col-span-full text-center text-sm text-gray-400">No canteens match “{q}”.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
