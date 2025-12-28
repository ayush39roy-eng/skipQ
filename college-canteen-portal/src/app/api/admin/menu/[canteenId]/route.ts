import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

// Prevent Next.js from attempting static data collection (depends on cookies/session)
export const dynamic = 'force-dynamic'

export async function GET(_: Request, props: { params: Promise<{ canteenId: string }> }) {
  const params = await props.params;
  const session = await requireRole(['ADMIN'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await prisma.menuItem.findMany({ where: { canteenId: params.canteenId }, orderBy: { name: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req: Request, props: { params: Promise<{ canteenId: string }> }) {
  const params = await props.params;
  const session = await requireRole(['ADMIN'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, priceCents, imageUrl, available } = await req.json()
  if (!name || typeof priceCents !== 'number') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  const item = await prisma.menuItem.create({ data: { canteenId: params.canteenId, name, priceCents, imageUrl, available: available ?? true } })
  return NextResponse.json(item)
}
