import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await requireRole(['ADMIN'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const vendors = await prisma.vendor.findMany({ select: { id: true, name: true } })
  return NextResponse.json(vendors)
}
