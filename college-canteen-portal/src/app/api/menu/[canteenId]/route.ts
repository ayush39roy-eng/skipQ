import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: { canteenId: string } }) {
  const { canteenId } = params
  const items = await prisma.menuItem.findMany({ where: { canteenId, available: true }, select: { id: true, name: true, priceCents: true, imageUrl: true } })
  return NextResponse.json(items)
}
