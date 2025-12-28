import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis once for Edge runtime
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limiters for different endpoint types (Edge-compatible)
const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:auth',
})

const orderLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  prefix: 'ratelimit:orders',
})

const paymentLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'ratelimit:payment',
})

const webhookLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'ratelimit:webhooks',
})

const adminLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1 m'),
  prefix: 'ratelimit:admin',
})

const aiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'ratelimit:ai',
})

const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'ratelimit:general',
})

function getRateLimiter(path: string): Ratelimit {
  if (path.startsWith('/api/auth/')) return authLimiter
  if (path.startsWith('/api/orders')) return orderLimiter
  if (path.startsWith('/api/payment/')) return paymentLimiter
  if (path.startsWith('/api/webhooks/')) return webhookLimiter
  if (path.startsWith('/api/admin/')) return adminLimiter
  if (path.startsWith('/api/ai/')) return aiLimiter
  if (path.startsWith('/api/vendor/')) return generalLimiter
  return generalLimiter
}

function getClientIp(req: NextRequest): string {
  // Use 'any' cast as ip might not be in the definition but exists in runtime on Vercel
  if ((req as any).ip) return (req as any).ip
  
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  
  return '127.0.0.1'
}

export default async function proxy(req: NextRequest) {
  const url = req.nextUrl
  const path = url.pathname

  // Protect vendor and admin routes - require session cookie
  if (path.startsWith('/vendor') || path.startsWith('/admin')) {
    const token = req.cookies.get('session')?.value
    if (!token) return NextResponse.redirect(new URL('/login', url))
    // Role checks are performed in the server components/route handlers.
  }

  // Rate Limiting for API routes using Upstash Redis
  if (path.startsWith('/api/')) {
    // Check if Upstash is configured (fail-safe: reject if not configured)
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.error('[RateLimit] Upstash Redis not configured - blocking request')
      return new NextResponse(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const ip = getClientIp(req)
    const limiter = getRateLimiter(path)

    try {
      const { success, limit, remaining, reset } = await limiter.limit(ip)
      
      if (!success) {
        console.warn(`[RateLimit] Blocked ${ip} on ${path} - limit: ${limit}, reset: ${reset}`)
        return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          }
        })
      }

      // Pass rate limit info in response headers
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Limit', String(limit))
      response.headers.set('X-RateLimit-Remaining', String(remaining))
      return response

    } catch (error) {
      // If Redis fails, log but allow request (fail-open for availability)
      // In high-security mode, change this to fail-closed
      console.error('[RateLimit] Redis error:', error)
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/vendor/:path*', '/admin/:path*', '/api/:path*']
}
