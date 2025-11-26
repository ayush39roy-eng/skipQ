'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

interface NavbarProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: any
}

export function Navbar({ session }: NavbarProps) {
    const pathname = usePathname()
    const isLoginPage = pathname === '/login'
    const isRegisterPage = pathname === '/register'

    return (
        <header className="sticky top-0 z-40 w-full border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-alt))]/95 backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--bg-alt))]/70">
            <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/skipq-logo.png"
                            alt="SkipQ logo"
                            width={36}
                            height={36}
                            priority
                            className="h-9 w-9 object-contain"
                        />
                        <span className="hidden text-sm font-semibold tracking-tight text-[rgb(var(--text))] sm:inline">SkipQ</span>
                    </Link>
                    <span className="hidden text-xs text-[rgb(var(--text-muted))] sm:inline">Fast ordering on campus</span>
                </div>
                <nav className="flex flex-nowrap items-center justify-end gap-2 text-xs font-medium">
                    {session?.role !== 'VENDOR' && <Link className="btn px-2 py-2 sm:px-4" href="/canteens">Canteens</Link>}
                    {session?.role === 'USER' && <Link className="btn px-2 py-2 sm:px-4" href="/order"><span className="sm:hidden">Orders</span><span className="hidden sm:inline">Order History</span></Link>}
                    {session?.role === 'VENDOR' && <Link className="btn px-2 py-2 sm:px-4" href="/vendor">Vendor</Link>}
                    {session?.role === 'ADMIN' && <Link className="btn px-2 py-2 sm:px-4" href="/admin">Admin</Link>}
                    {!session ? (
                        isRegisterPage ? (
                            <Link href="/login" className="btn px-2 py-2 sm:px-4">Sign In</Link>
                        ) : isLoginPage ? (
                            <Link href="/register" className="btn px-2 py-2 sm:px-4">Sign Up</Link>
                        ) : (
                            <Link href="/register" className="btn px-2 py-2 sm:px-4">Sign Up</Link>
                        )
                    ) : (
                        <a href="/api/auth/logout" className="btn-secondary px-2 py-2 sm:px-4">Logout</a>
                    )}
                </nav>
            </div>
        </header>
    )
}
