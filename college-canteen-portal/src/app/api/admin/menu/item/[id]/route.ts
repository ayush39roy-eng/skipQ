import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requireRole(['ADMIN'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const data: Prisma.MenuItemUpdateInput = {}
  if (typeof body.name === 'string') data.name = body.name
  if (typeof body.priceCents === 'number') data.priceCents = body.priceCents
  if (typeof body.available === 'boolean') data.available = body.available
  if (typeof body.imageUrl === 'string' || body.imageUrl === null) data.imageUrl = body.imageUrl
  const updated = await prisma.menuItem.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}
