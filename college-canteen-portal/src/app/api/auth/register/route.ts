import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !name || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { email, name, passwordHash, role: 'USER' } })
    return NextResponse.json({ id: user.id })
  } catch (error) {
    console.error('Registration failed', error)
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
  }
}
