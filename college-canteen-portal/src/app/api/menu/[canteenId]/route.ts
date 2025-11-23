import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: { canteenId: string } }) {
  const { canteenId } = params
  const [canteen, items] = await Promise.all([
    prisma.canteen.findUnique({
      where: { id: canteenId },
      select: {
        id: true,
        name: true,
        openingTime: true,
        closingTime: true,
        autoMode: true,
        manualIsOpen: true
      }
    }),
    prisma.menuItem.findMany({ where: { canteenId, available: true }, select: { id: true, name: true, priceCents: true, imageUrl: true, description: true } })
  ])

  if (!canteen) {
    return NextResponse.json({ error: 'Canteen not found' }, { status: 404 })
  }

  return NextResponse.json({ canteen, items })
}
