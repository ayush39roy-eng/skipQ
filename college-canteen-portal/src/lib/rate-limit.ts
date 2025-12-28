import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client from environment variables
const redis = Redis.fromEnv()

/**
 * Rate limiters for different endpoint types.
 * Using sliding window algorithm for smooth rate limiting.
 */

// Auth routes: 10 requests per minute (strict to prevent credential stuffing)
export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:auth',
  analytics: true,
})

// Order creation: 20 requests per minute
export const orderRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  prefix: 'ratelimit:orders',
  analytics: true,
})

// Payment endpoints: 30 requests per minute
export const paymentRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'ratelimit:payment',
  analytics: true,
})

// Webhooks: 100 requests per minute (higher limit for external services)
export const webhookRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'ratelimit:webhooks',
  analytics: true,
})

// Admin endpoints: 50 requests per minute
export const adminRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1 m'),
  prefix: 'ratelimit:admin',
  analytics: true,
})

// AI training: 5 requests per minute (expensive operations)
export const aiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'ratelimit:ai',
  analytics: true,
})

// General API: 100 requests per minute (default fallback)
export const generalRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'ratelimit:general',
  analytics: true,
})

export type RateLimiterType = 
  | 'auth' 
  | 'orders' 
  | 'payment' 
  | 'webhooks' 
  | 'admin' 
  | 'ai' 
  | 'general'

const RATE_LIMITERS: Record<RateLimiterType, Ratelimit> = {
  auth: authRateLimiter,
  orders: orderRateLimiter,
  payment: paymentRateLimiter,
  webhooks: webhookRateLimiter,
  admin: adminRateLimiter,
  ai: aiRateLimiter,
  general: generalRateLimiter,
}

/**
 * Get the appropriate rate limiter based on the request path
 */
export function getRateLimiterForPath(path: string): Ratelimit {
  if (path.startsWith('/api/auth/')) return authRateLimiter
  if (path.startsWith('/api/orders')) return orderRateLimiter
  if (path.startsWith('/api/payment/')) return paymentRateLimiter
  if (path.startsWith('/api/webhooks/')) return webhookRateLimiter
  if (path.startsWith('/api/admin/')) return adminRateLimiter
  if (path.startsWith('/api/ai/')) return aiRateLimiter
  return generalRateLimiter
}

/**
 * Check rate limit for a given identifier and limiter type.
 * Returns rate limit result with success status and metadata.
 */
export async function checkRateLimit(identifier: string, type: RateLimiterType = 'general') {
  const limiter = RATE_LIMITERS[type]
  return await limiter.limit(identifier)
}

/**
 * Extract client identifier (IP) from request
 * Handles various proxy headers for accurate IP detection
 */
export function getClientIdentifier(req: Request): string {
  const headers = req.headers
  
  // Standard proxy headers in order of preference
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(',')[0].trim()
  }
  
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  
  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp.trim()
  
  // Fallback
  return '127.0.0.1'
}
