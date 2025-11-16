import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  await clearSession()
  const url = new URL('/', req.url)
  return NextResponse.redirect(url)
}

export async function POST(req: Request) {
  await clearSession()
  const url = new URL('/', req.url)
  return NextResponse.redirect(url)
}
