import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/session'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'Missing email/password' }, { status: 400 })
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const allowedRoles = ['ADMIN','VENDOR','USER'] as const
    const role: 'ADMIN'|'VENDOR'|'USER' = allowedRoles.includes(user.role as any) ? (user.role as 'ADMIN'|'VENDOR'|'USER') : 'USER'
    await createSession(user.id, role)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 })
  }
}
