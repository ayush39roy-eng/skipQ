import { headers } from 'next/headers'

/**
 * Get the current Request ID (Process Trace ID)
 * In Next.js App Router, we usually check headers.
 * If X-Request-ID is missing, we check if we can generate one scoped to the request.
 */
export async function getRequestId(): Promise<string> {
    const headerList = await headers()
    return headerList.get('x-request-id') || headerList.get('x-trace-id') || crypto.randomUUID()
}

/**
 * Helper to get client IP
 */
export async function getClientIp(): Promise<string> {
    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || headerList.get('x-real-ip')
    
    if (ip === '::1') return '127.0.0.1'
    if (ip) return ip
    
    // Fallback for local development
    if (process.env.NODE_ENV === 'development') {
        return '127.0.0.1'
    }
    
    return 'unknown'
}
