import { NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
        return NextResponse.redirect(new URL('/login?error=Google+auth+failed', req.url))
    }

    if (!code) {
        return NextResponse.redirect(new URL('/login?error=No+code+provided', req.url))
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: 'Google Auth not configured' }, { status: 500 })
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
    const client = new OAuth2Client(clientId, clientSecret, redirectUri)

    try {
        const { tokens } = await client.getToken(code)
        client.setCredentials(tokens)

        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token!,
            audience: clientId,
        })
        const payload = ticket.getPayload()

        if (!payload || !payload.email) {
            return NextResponse.redirect(new URL('/login?error=No+email+from+Google', req.url))
        }

        const email = payload.email
        const name = payload.name || email.split('@')[0]

        // Find or create user
        let user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    role: 'USER', // Default role
                    // No passwordHash for Google users
                }
            })
        }

        // Create session
        await createSession(user.id, user.role as 'USER' | 'VENDOR' | 'ADMIN')

        return NextResponse.redirect(new URL('/canteens', req.url))

    } catch (err) {
        console.error('Google Auth Error:', err)
        return NextResponse.redirect(new URL('/login?error=Authentication+failed', req.url))
    }
}
