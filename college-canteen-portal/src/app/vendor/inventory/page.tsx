import InventoryDashboard from '@/components/vendor/inventory/InventoryDashboard'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const session = await getSession()
  if (!session || session.role !== 'VENDOR' || !session.user.vendorId) {
    redirect('/auth/login?callbackUrl=/vendor/inventory')
  }

  const vendorId = session.user.vendorId

  let items = []
  try {
    items = await prisma.inventoryItem.findMany({
      where: { vendorId: vendorId },
      orderBy: { name: 'asc' }
    })
  } catch (error) {
    console.error('Failed to fetch inventory items:', error)
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-500">Error Loading Inventory</h2>
        <p className="mt-2 text-gray-600">Please try refreshing the page or contact support.</p>
      </div>
    )
  }

  return <InventoryDashboard items={items} vendorId={vendorId} />
}
