import PosInterface from './PosInterface'
import { prisma } from '@/lib/prisma'

import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function POSPage() {
  const session = await getSession()
  if (!session || session.role !== 'VENDOR' || !session.user.vendorId) {
    redirect('/auth/login?callbackUrl=/vendor/pos')
  }

  let items = []

  try {
    // Fetch items from DB
    items = await prisma.menuItem.findMany({
      where: { available: true },
      select: {
        id: true,
        name: true,
        priceCents: true,
        section: {
          select: { name: true }
        },
        imageUrl: true
      },
      orderBy: { name: 'asc' }
    })
  } catch (error) {
    console.error('Failed to fetch POS items:', error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
            <h2 className="text-xl font-bold text-red-600">System Error</h2>
            <p className="mt-2 text-gray-600">Could not load menu items. Please refresh or contact support.</p>
        </div>
      </div>
    )
  }

  return <PosInterface initialItems={items} />
}
