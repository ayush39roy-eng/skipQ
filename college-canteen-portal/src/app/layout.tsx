import './globals.css'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { Analytics } from '@vercel/analytics/react'

export const metadata = { title: 'College Canteen Portal' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body>
        <header className="sticky top-0 z-40 w-full border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-alt))]/95 backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--bg-alt))]/70">
          <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm font-semibold tracking-tight text-[rgb(var(--text))]">Canteen Portal</Link>
              <span className="hidden text-xs text-[rgb(var(--text-muted))] sm:inline">Fast ordering on campus</span>
            </div>
            <nav className="flex items-center gap-2 text-xs font-medium">
              <Link className="btn-secondary px-3 py-1.5" href="/canteens">Canteens</Link>
              {session?.role === 'VENDOR' && <Link className="btn-secondary px-3 py-1.5" href="/vendor">Vendor</Link>}
              {session?.role === 'ADMIN' && <Link className="btn-secondary px-3 py-1.5" href="/admin">Admin</Link>}
              {!session ? (
                <Link href="/login" className="btn px-4 py-2">Login</Link>
              ) : (
                <a href="/api/auth/logout" className="btn px-4 py-2">Logout</a>
              )}
            </nav>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1400px] px-6 py-8">{children}</div>
        <Analytics />
      </body>
    </html>
  )
}
