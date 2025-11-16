import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

export async function GET() {
  const session = await requireRole(['ADMIN'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const canteens = await prisma.canteen.findMany({ select: { id: true, name: true, location: true, vendorId: true } })
  return NextResponse.json(canteens)
}

export async function POST(req: Request) {
  const session = await requireRole(['ADMIN'])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, location, vendorId } = await req.json()
  if (!name || !location || !vendorId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const canteen = await prisma.canteen.create({ data: { name, location, vendorId } })
  return NextResponse.json(canteen)
}
