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

  // Rate Limiting (Basic Token Bucket per IP)
  if (path.startsWith('/api/')) {
    const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute
    const limit = 100 // requests per minute

    // Note: In a real production app, use Redis. This in-memory map resets on server restart/redeploy.
    // We use a global map attached to globalThis to survive hot reloads in dev, but it's still process-local.
    const globalWithRateLimit = globalThis as unknown as { _rateLimitMap: Map<string, { count: number, startTime: number }> }
    const globalRateLimit = globalWithRateLimit._rateLimitMap || (globalWithRateLimit._rateLimitMap = new Map())

    // Cleanup old entries periodically (simple optimization to prevent memory leak)
    if (Math.random() < 0.01) { // 1% chance to cleanup
      for (const [key, val] of globalRateLimit.entries()) {
        if (now - val.startTime > windowMs) {
          globalRateLimit.delete(key)
        }
      }
    }

    const record = globalRateLimit.get(ip) || { count: 0, startTime: now }

    if (now - record.startTime > windowMs) {
      // Reset window
      record.count = 1
      record.startTime = now
    } else {
      record.count++
    }

    globalRateLimit.set(ip, record)

    if (record.count > limit) {
      return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/vendor/:path*', '/admin/:path*']
}
