'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const COFOUNDERS: { name: string; url?: string }[] = [
    { name: 'Ayush Roy', url: 'https://www.linkedin.com/in/ayush-roy-674808209/' },
    { name: 'Daksh Goyal', url: 'https://www.linkedin.com/in/daksh-goyal387/' },
    { name: 'Somya Arora', url: 'https://www.linkedin.com/in/somya-arora-607449301/' },
]

const FOUNDER_CONTACT = {
    address: 'S-2, D-6, Apartment, Shyam Park Ext, Sahibabad, Ghaziabad, Uttar Pradesh, 201005, India',
    phone: '+91 83839 34397',
}

export default function SiteShell({ 
  children, 
  userRole,
  activePaymentId
}: { 
  children: React.ReactNode
  userRole?: string
  activePaymentId?: string
}) {
  const pathname = usePathname()
  
  // HIDE Header/Footer on specific "App" routes like Terminal or Vendor Portal
  const isAppRoute = pathname?.startsWith('/vendor') || pathname?.startsWith('/terminal') || pathname?.startsWith('/admin')

  if (isAppRoute) {
    return <main className="min-h-screen w-full bg-[#FFF8F0]">{children}</main>
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FFF8F0]">
        <header className="sticky top-0 z-40 w-full border-b-4 border-black bg-white shadow-[0px_4px_0px_#000000]">
            <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6">
                <div className="flex flex-1 items-center gap-3">
                    <Link href="/" className="flex items-center gap-2 group">
                       <div className="relative transform transition-transform group-hover:scale-110"> 
                        <div className="absolute inset-0 bg-black rounded-full translate-x-1 translate-y-1"></div>
                        <Image
                            src="/skipq-logo.png"
                            alt="SkipQ"
                            width={40}
                            height={40}
                            priority
                            className="h-10 w-10 object-contain relative z-10 bg-white rounded-full border-2 border-black"
                        />
                       </div>
                       <span className="hidden text-xl font-black tracking-black text-black uppercase sm:inline drop-shadow-[2px_2px_0px_rgba(0,0,0,0.2)]">SkipQ</span>
                    </Link>
                </div>
                <nav className="flex flex-1 flex-wrap items-center justify-end gap-3 text-sm font-bold sm:justify-end">
                    {userRole !== 'VENDOR' && (
                        <Link className="px-4 py-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all rounded-lg uppercase tracking-wider text-xs" href="/canteens">
                            Canteens
                        </Link>
                    )}
                    {userRole === 'USER' && (
                        <Link className="px-4 py-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all rounded-lg uppercase tracking-wider text-xs" href="/order">
                            <span className="sm:hidden">Orders</span><span className="hidden sm:inline">My Orders</span>
                        </Link>
                    )}
                    {userRole === 'VENDOR' && (
                        <Link className="px-4 py-2 bg-[#FFD166] border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all rounded-lg uppercase tracking-wider text-xs" href="/vendor">
                            Vendor Hub
                        </Link>
                    )}
                    {userRole === 'ADMIN' && (
                         <Link className="px-4 py-2 bg-[#EF476F] text-white border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all rounded-lg uppercase tracking-wider text-xs" href="/admin">
                            Admin
                        </Link>
                    )}
                    {!userRole ? (
                        <Link href="/login" className="px-4 py-2 bg-[#06D6A0] border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all rounded-lg uppercase tracking-wider text-xs">
                            Login
                        </Link>
                    ) : (
                        <a href="/api/auth/logout" className="px-4 py-2 bg-slate-200 border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all rounded-lg uppercase tracking-wider text-xs">
                            Logout
                        </a>
                    )}
                </nav>
            </div>
        </header>
        
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6">{children}</main>
        
        <footer className="mt-16 border-t-4 border-black bg-white">
            <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-md space-y-4">
                    <div className="inline-block px-3 py-1 bg-black text-[#FF9F1C] font-black text-xl uppercase tracking-widest transform -rotate-1">
                        SkipQ
                    </div>
                    <p className="text-xl font-bold text-black border-l-4 border-[#FF9F1C] pl-4">The cheat code for campus dining.</p>
                    <p className="text-sm font-medium text-slate-600">Order, pay and pick up without queues. Vendors stay in sync with real-time dashboards.</p>
                </div>
                <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <p className="text-xs uppercase font-black tracking-widest text-[#FF9F1C] mb-4">Explore</p>
                        <ul className="space-y-3 text-sm font-bold text-black/80">
                            {userRole !== 'VENDOR' && <li><Link className="hover:text-black hover:underline decoration-2 underline-offset-2" href="/canteens">Browse Menus</Link></li>}
                            {activePaymentId && (
                                <li>
                                    <Link className="hover:text-black hover:underline decoration-2 underline-offset-2" href={`/pay/${encodeURIComponent(activePaymentId)}`}>
                                        Active Payment
                                    </Link>
                                </li>
                            )}
                            {userRole === 'ADMIN' && <li><Link className="hover:text-black hover:underline decoration-2 underline-offset-2" href="/admin">Admin Panel</Link></li>}
                        </ul>
                    </div>
                    <div>
                        <p className="text-xs uppercase font-black tracking-widest text-[#FF9F1C] mb-4">Support</p>
                        <ul className="space-y-3 text-sm font-bold text-black/80">
                            <li><Link className="hover:text-black hover:underline decoration-2 underline-offset-2" href="/privacy">Privacy Policy</Link></li>
                            <li><Link className="hover:text-black hover:underline decoration-2 underline-offset-2" href="/terms-and-conditions">Terms &amp; Conditions</Link></li>
                            <li><Link className="hover:text-black hover:underline decoration-2 underline-offset-2" href="/cancellation-refund">Cancellation Info</Link></li>
                            <li><a className="hover:text-black hover:underline decoration-2 underline-offset-2" href="mailto:support@skipq.app">support@skipq.app</a></li>
                        </ul>
                    </div>
                    <div>
                        <p className="text-xs uppercase font-black tracking-widest text-[#FF9F1C] mb-4">The Team</p>
                        <ul className="space-y-3 text-sm font-bold text-black/80">
                            <li className="font-extrabold text-black">
                                {COFOUNDERS.map(({ name, url }, i) => (
                                    <span key={name}>
                                        {url ? (
                                            <a className="hover:bg-[#FF9F1C] hover:text-black transition-colors px-1 -mx-1" href={url} target="_blank" rel="noopener noreferrer">{name}</a>
                                        ) : (
                                            name
                                        )}
                                        {i < COFOUNDERS.length - 1 && <span className="">, </span>}
                                    </span>
                                ))}
                            </li>
                            <li className="text-xs text-slate-500 font-mono bg-slate-100 p-2 rounded border-2 border-dashed border-slate-300">
                                {FOUNDER_CONTACT.address}
                            </li>
                            <li><a className="inline-block px-3 py-1 bg-black text-white text-xs font-bold rounded-full hover:bg-[#FF9F1C] hover:text-black transition-colors" href={`tel:${FOUNDER_CONTACT.phone.replace(/\s+/g, '')}`}>{FOUNDER_CONTACT.phone}</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="border-t-4 border-black bg-[#FF9F1C]">
                <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-3 text-xs font-bold text-black sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p>© {new Date().getFullYear()} SkipQ. Press Start to Continue.</p>
                    <div className="text-center sm:text-right">
                        <p>Made for campus dining excellence.</p>
                    </div>
                </div>
            </div>
        </footer>
    </div>
  )
}
