import './globals.css'
import Link from 'next/link'
import Image from 'next/image'
import { getSession } from '@/lib/session'
import { Analytics } from '@vercel/analytics/react'

const FOUNDER = {
  name: 'Ayush Roy',
  address: 'S-2, D-6, Apartment, Shyam Park Ext, Sahibabad, Ghaziabad, Uttar Pradesh, 201005, India',
  phone: '+91 83839 34397',
}

export const metadata = { title: 'College Canteen Portal' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-[rgb(var(--bg))]">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 w-full border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-alt))]/95 backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--bg-alt))]/70">
            <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6">
              <div className="flex flex-1 items-center gap-3">
                <Link href="/" className="flex items-center gap-2">
                  <Image
                    src="/skipq-logo.png"
                    alt="SkipQ logo"
                    width={36}
                    height={36}
                    priority
                    className="h-9 w-9 object-contain"
                  />
                  <span className="text-sm font-semibold tracking-tight text-[rgb(var(--text))]">Canteen Portal</span>
                </Link>
                <span className="hidden text-xs text-[rgb(var(--text-muted))] sm:inline">Fast ordering on campus</span>
              </div>
              <nav className="flex flex-1 flex-wrap items-center justify-end gap-2 text-xs font-medium sm:justify-end">
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
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6">{children}</main>
          <footer className="mt-16 border-t border-[rgb(var(--border))] bg-[rgb(var(--bg-alt))]">
            <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-md space-y-3">
                <p className="text-sm uppercase tracking-[0.4em] text-[rgb(var(--text-muted))]">SkipQ</p>
                <p className="text-2xl font-semibold text-[rgb(var(--text))]">Faster canteen experiences for modern campuses.</p>
                <p className="text-sm text-[rgb(var(--text-muted))]">Order, pay and pick up without queues. Vendors stay in sync with real-time dashboards and WhatsApp alerts.</p>
              </div>
              <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--text-muted))]">Product</p>
                  <ul className="mt-3 space-y-2 text-sm text-[rgb(var(--text))]">
                    <li><Link className="hover:text-sky-400" href="/canteens">Menus</Link></li>
                    <li><Link className="hover:text-sky-400" href="/pay/123">Payments</Link></li>
                    <li><Link className="hover:text-sky-400" href="/admin">Admin</Link></li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--text-muted))]">Support</p>
                  <ul className="mt-3 space-y-2 text-sm text-[rgb(var(--text))]">
                    <li><Link className="hover:text-sky-400" href="/privacy">Privacy</Link></li>
                    <li><Link className="hover:text-sky-400" href="/terms-and-conditions">Terms &amp; Conditions</Link></li>
                    <li><Link className="hover:text-sky-400" href="/cancellation-refund">Cancellation &amp; Refunds</Link></li>
                    <li><a className="hover:text-sky-400" href="mailto:support@skipq.app">Email us</a></li>
                    <li><a className="hover:text-sky-400" href="tel:+918383934397">+91 83839 34397</a></li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--text-muted))]">Status</p>
                  <ul className="mt-3 space-y-2 text-sm text-[rgb(var(--text))]">
                    <li>Uptime: 99.96%</li>
                    <li>Vendors live: 38</li>
                    <li>Orders today: 1,242</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--text-muted))]">Founder</p>
                  <ul className="mt-3 space-y-2 text-sm text-[rgb(var(--text))]">
                    <li className="font-semibold">{FOUNDER.name}</li>
                    <li className="text-[rgb(var(--text-muted))] leading-relaxed">{FOUNDER.address}</li>
                    <li><a className="hover:text-sky-400" href={`tel:${FOUNDER.phone.replace(/\s+/g, '')}`}>{FOUNDER.phone}</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))]">
              <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-4 text-xs text-[rgb(var(--text-muted))] sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p>© {new Date().getFullYear()} SkipQ · Ayush Roy. All rights reserved.</p>
                <div className="text-[rgb(var(--text-muted))] text-center sm:text-right">
                  <p>Made for campus dining excellence.</p>
                  <p className="text-[11px]">{FOUNDER.address}</p>
                </div>
              </div>
            </div>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
