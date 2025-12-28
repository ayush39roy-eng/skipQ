import MenuManager from '@/components/vendor/menu/MenuManager'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { VendorItem } from '@/types/vendor'

export const dynamic = 'force-dynamic'

export default async function VendorMenuPage() {
  const session = await getSession()
  if (!session || session.role !== 'VENDOR' || !session.user.vendorId) {
    redirect('/auth/login?callbackUrl=/vendor/menu')
  }

  const vendorId = session.user.vendorId
  console.log('[VendorMenu] Fetching for Vendor:', vendorId)

  // 1. Get all canteens for this vendor
  const canteens = await prisma.canteen.findMany({
      where: { vendorId },
      select: { id: true }
  })
  const canteenIds = canteens.map(c => c.id)
  console.log('[VendorMenu] Found Canteens:', canteenIds)

  const rawItems = await prisma.menuItem.findMany({
    where: { canteenId: { in: canteenIds } },
    select: {
        id: true,
        name: true,
        priceCents: true,
        section: { select: { name: true } },
        available: true,
        isVegetarian: true, 
        imageUrl: true
    },
    orderBy: { name: 'asc' }
  })
  console.log('[VendorMenu] Found Items:', rawItems.length)

  // Normalize
  const items: VendorItem[] = rawItems.map(i => ({
    id: i.id,
    name: i.name,
    priceCents: i.priceCents,
    section: i.section?.name || 'Other',
    available: i.available,
    isVegetarian: i.isVegetarian,
    imageUrl: i.imageUrl
  }))

  return <MenuManager items={items} vendorId={vendorId} />
}
