import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const path = url.pathname

  // Protect vendor and admin routes
  if (path.startsWith('/vendor') || path.startsWith('/admin')) {
    const token = req.cookies.get('session')?.value
    if (!token) return NextResponse.redirect(new URL('/login', url))
    // Role checks are performed in the server components/route handlers.
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/vendor/:path*', '/admin/:path*']
}
