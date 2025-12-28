import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'

const allowedRoles = ['ADMIN', 'VENDOR', 'USER'] as const
type Role = typeof allowedRoles[number]

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && allowedRoles.includes(value as Role)
}

// Force dynamic to avoid prerender issues (session cookie access)
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password) return NextResponse.json({ error: 'Missing email/password' }, { status: 400 })
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const role: Role = isRole(user.role) ? user.role : 'USER'
    const token = await createSession(user.id, role)
    // Return token for mobile/API clients
    return NextResponse.json({ ok: true, role, token })
  } catch (error) {
    console.error('Login failed', error)
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 })
  }
}
