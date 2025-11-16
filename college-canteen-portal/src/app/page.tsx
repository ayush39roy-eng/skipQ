import Link from 'next/link'
import { getSession } from '@/lib/session'

export default async function HomePage() {
  const session = await getSession()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Welcome to College Canteen Portal</h1>
      {!session ? (
        <div className="card">
          <p className="mb-2">Please login to continue.</p>
          <Link href="/login" className="btn">Login</Link>
        </div>
      ) : (
        <div className="card">
          <p className="mb-2">Hello {session.user.name} ({session.role.toLowerCase()})</p>
          <div className="flex gap-2">
            <Link href="/canteens" className="btn">Browse Canteens</Link>
            {session.role === 'VENDOR' && <Link href="/vendor" className="btn">Vendor Dashboard</Link>}
            {session.role === 'ADMIN' && <Link href="/admin" className="btn">Admin Dashboard</Link>}
          </div>
        </div>
      )}
    </div>
  )
}
