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

  // 2. Fetch Menu Items with Recipe Info
  const rawItems = await prisma.menuItem.findMany({
    where: { canteenId: { in: canteenIds } },
    select: {
        id: true,
        name: true,
        priceCents: true,
        section: { select: { name: true } },
        available: true,
        isVegetarian: true, 
        imageUrl: true,
        description: true,
        recipe: {
            select: {
                items: {
                    select: {
                        inventoryItemId: true,
                        quantity: true,
                        inventoryItem: {
                            select: { name: true, unit: true }
                        }
                    }
                }
            }
        }
    },
    orderBy: { name: 'asc' }
  })
  
  // 3. Fetch All Inventory Items for the Dropdown
  const inventoryItems = await prisma.inventoryItem.findMany({
      where: { vendorId },
      select: { id: true, name: true, unit: true },
      orderBy: { name: 'asc' }
  })

  // Normalize
  const items: VendorItem[] = rawItems.map(i => ({
    id: i.id,
    name: i.name,
    priceCents: i.priceCents,
    section: i.section?.name || 'Other',
    available: i.available,
    isVegetarian: i.isVegetarian,
    imageUrl: i.imageUrl,
    description: i.description || undefined,
    recipe: i.recipe ? {
        items: i.recipe.items.map(ri => ({
            inventoryItemId: ri.inventoryItemId,
            quantity: ri.quantity,
            inventoryItem: {
                name: ri.inventoryItem.name,
                unit: ri.inventoryItem.unit
            }
        }))
    } : null
  }))

  return <MenuManager items={items} vendorId={vendorId} inventoryItems={inventoryItems} />
}
