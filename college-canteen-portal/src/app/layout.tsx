import './globals.css'
import Link from 'next/link'
import { getSession } from '@/lib/session'

export const metadata = {
  title: 'College Canteen Portal',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <nav className="border-b bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
            <Link href="/" className="font-semibold">Canteen Portal</Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/canteens">Canteens</Link>
              {session?.role === 'VENDOR' && <Link href="/vendor">Vendor</Link>}
              {session?.role === 'ADMIN' && <Link href="/admin">Admin</Link>}
              {!session ? (
                <Link href="/login" className="btn">Login</Link>
              ) : (
                <a href="/api/auth/logout" className="btn">Logout</a>
              )}
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  )
}
