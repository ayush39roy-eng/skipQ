"use client"
import useSWR from 'swr'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then(r=>r.json())

export default function CanteensPage() {
  const { data, error } = useSWR('/api/canteens', fetcher)
  if (error) return <p>Failed to load.</p>
  if (!data) return <p>Loading...</p>
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Canteens</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.map((c: any)=> (
          <div key={c.id} className="card flex items-center justify-between">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-gray-600">{c.location}</div>
            </div>
            <Link className="btn" href={`/canteens/${c.id}`}>View Menu</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
