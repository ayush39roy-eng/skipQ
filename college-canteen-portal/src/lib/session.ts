import { cookies } from 'next/headers'
import { prisma } from './prisma'
import crypto from 'crypto'
import { addHours } from './time'

export async function createSession(userId: string, role: 'USER'|'VENDOR'|'ADMIN') {
  const token = crypto.randomBytes(24).toString('hex')
  const expiresAt = addHours(new Date(), 24)
  await prisma.session.create({ data: { userId, token, role, expiresAt } })
  cookies().set('session', token, { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 60*60*24 })
  return token
}

export async function getSession() {
  const token = cookies().get('session')?.value
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) return null
  if (session.expiresAt < new Date()) return null
  return session
}

export async function requireRole(roles: ('USER'|'VENDOR'|'ADMIN')[]) {
  const session = await getSession()
  if (!session) return null
  if (!roles.includes(session.role)) return null
  return session
}

export async function clearSession() {
  const token = cookies().get('session')?.value
  if (token) {
    await prisma.session.deleteMany({ where: { token } })
    cookies().delete('session')
  }
}
