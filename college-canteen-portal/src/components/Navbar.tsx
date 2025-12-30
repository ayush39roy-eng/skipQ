'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

interface NavbarProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: any
}

export function Navbar({ session }: NavbarProps) {
    const pathname = usePathname()
    const isLoginPage = pathname === '/login'
    
    // Define navigation items based on role
    const navItems = [
        { label: 'Canteens', href: '/canteens', show: session?.role !== 'VENDOR' },
        { label: 'Order History', href: '/order', show: session?.role === 'USER' },
        { label: 'Vendor Dashboard', href: '/vendor', show: session?.role === 'VENDOR' },
        { label: 'Admin', href: '/admin', show: session?.role === 'ADMIN' },
    ].filter(item => item.show)

    return (
        <header className="sticky top-0 z-50 w-full border-b-[3px] border-black bg-white shadow-sm">
            <div className="mx-auto flex h-20 w-full max-w-[1400px] items-center justify-between px-4 sm:px-8">
                
                {/* Brand / Logo Zone */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="group flex items-center gap-3 transition-transform active:scale-95">
                        {/* Logo Cartridge */}
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black bg-brand-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                            <Image
                                src="/skipq-logo.png"
                                alt="SkipQ"
                                width={24}
                                height={24}
                                priority
                                className="h-6 w-6 object-contain brightness-0 invert" 
                            />
                        </div>
                        <div className="hidden flex-col md:flex">
                            <span className="text-2xl font-black leading-none tracking-tight text-black">SkipQ</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Campus Orders</span>
                        </div>
                    </Link>
                </div>

                {/* Navigation Zone */}
                <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar sm:gap-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition-all border-2 flex-shrink-0",
                                    isActive 
                                        ? "bg-game-primary text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                                        : "text-gray-600 border-transparent hover:border-black hover:bg-game-bg hover:text-black"
                                )}
                            >
                                {item.label}
                            </Link>
                        )
                    })}

                    {/* Auth / User Zone */}
                    <div className="ml-2 flex items-center border-l-2 border-gray-200 pl-4">
                        {!session ? (
                            <Link 
                                href={isLoginPage ? "/register" : "/login"} 
                                className="game-btn px-6 py-2 text-xs sm:text-sm"
                            >
                                {isLoginPage ? "Sign Up" : "Login"}
                            </Link>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="hidden text-right text-xs font-bold leading-tight sm:block">
                                    <span className="block text-gray-400">Player 1</span>
                                    <span className="block text-black">{session.user?.name?.split(' ')[0]}</span>
                                </span>
                                <form action="/api/auth/logout" method="POST">
                                    <button 
                                        type="submit"
                                        className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-black bg-gray-100 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:bg-red-50 hover:text-red-600 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                        title="Logout"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-5 w-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    )
}
