import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const canteens = await prisma.canteen.findMany({ select: { id: true, name: true, location: true } })
  return NextResponse.json(canteens)
}
