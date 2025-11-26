import './globals.css'
import Link from 'next/link'

import { getSession } from '@/lib/session'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from "@vercel/speed-insights/next"

const COFOUNDERS: { name: string; url?: string }[] = [
    { name: 'Ayush Roy', url: 'https://www.linkedin.com/in/ayush-roy-674808209/' },
    { name: 'Daksh Goyal', url: 'https://www.linkedin.com/in/daksh-goyal387/' },
    { name: 'Somya Arora', url: 'https://www.linkedin.com/in/somya-arora-607449301/' },
]

const FOUNDER_CONTACT = {
    address: 'S-2, D-6, Apartment, Shyam Park Ext, Sahibabad, Ghaziabad, Uttar Pradesh, 201005, India',
    phone: '+91 83839 34397',
}

export const metadata = {
    title: 'SkipQ',
    icons: {
        icon: '/skipq-logo.png',
        apple: '/skipq-logo.png',
    },
}

import { Navbar } from '@/components/Navbar'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession()
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <body className="bg-[rgb(var(--bg))]">
                <div className="flex min-h-screen flex-col">
                    <Navbar session={session} />
                    <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6">{children}</main>
                    <footer className="mt-16 border-t border-[rgb(var(--border))] bg-[rgb(var(--bg-alt))]">
                        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-md space-y-3">
                                <p className="text-sm uppercase tracking-[0.4em] text-[rgb(var(--text-muted))]">SkipQ</p>
                                <p className="text-2xl font-semibold text-[rgb(var(--text))]">Faster canteen experiences for modern campuses.</p>
                                <p className="text-sm text-[rgb(var(--text-muted))]">Order, pay and pick up without queues. Vendors stay in sync with real-time dashboards and WhatsApp alerts.</p>
                            </div>
                            <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--text-muted))]">Product</p>
                                    <ul className="mt-3 space-y-2 text-sm text-[rgb(var(--text))]">
                                        {session?.role !== 'VENDOR' && <li><Link className="hover:text-sky-400" href="/canteens">Menus</Link></li>}
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
                                {/* Status block removed per request */}
                                <div>
                                    <p className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--text-muted))]">Co-Founders</p>
                                    <ul className="mt-3 space-y-2 text-sm text-[rgb(var(--text))]">
                                        <li className="font-semibold">
                                            {COFOUNDERS.map(({ name, url }, i) => (
                                                <span key={name}>
                                                    {url ? (
                                                        <a className="hover:text-sky-400" href={url} target="_blank" rel="noopener noreferrer">{name}</a>
                                                    ) : (
                                                        name
                                                    )}
                                                    {i < COFOUNDERS.length - 1 && <span className="mx-1">,&nbsp;</span>}
                                                </span>
                                            ))}
                                        </li>
                                        <li className="text-[rgb(var(--text-muted))] leading-relaxed">{FOUNDER_CONTACT.address}</li>
                                        <li><a className="hover:text-sky-400" href={`tel:${FOUNDER_CONTACT.phone.replace(/\s+/g, '')}`}>{FOUNDER_CONTACT.phone}</a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))]">
                            <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-4 text-xs text-[rgb(var(--text-muted))] sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <p>© {new Date().getFullYear()} SkipQ. All rights reserved.</p>
                                <div className="text-[rgb(var(--text-muted))] text-center sm:text-right">
                                    <p>Made for campus dining excellence.</p>
                                    <p className="text-[11px]">{FOUNDER_CONTACT.address}</p>
                                </div>
                            </div>
                        </div>
                    </footer>
                </div>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    )
}
