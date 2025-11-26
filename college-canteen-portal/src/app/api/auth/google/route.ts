import { NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'

export const dynamic = 'force-dynamic'

export async function GET() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: 'Google Auth not configured' }, { status: 500 })
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`

    const client = new OAuth2Client(clientId, clientSecret, redirectUri)

    const authorizeUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ],
        prompt: 'consent',
    })

    return NextResponse.redirect(authorizeUrl)
}
