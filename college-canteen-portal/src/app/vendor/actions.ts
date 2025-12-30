'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { PaymentMode, FulfillmentType } from '@/types/vendor'
import { getSession } from '@/lib/session'
import { requireVendorMode, VendorMode } from '@/lib/vendor-mode'

// -- ORDERS --

import { OrderService } from './services/order-service'

export async function createPosOrder(
  vendorId: string,
  items: { itemId: string; quantity: number; priceCents: number }[],
  paymentMode: PaymentMode,
  fulfillmentType: FulfillmentType,
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' = 'PENDING'
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'VENDOR') return { success: false, error: 'Unauthorized' }
    
    // Double check vendorId match
    if (session.user.vendorId !== vendorId) return { success: false, error: 'Forbidden' }

    // Enforce Vendor Mode
    try {
        await requireVendorMode(vendorId, VendorMode.FULL_POS)
    } catch (e: any) {
        return { success: false, error: e.message }
    }

    // Fetch the canteen associated with this vendor
    const canteen = await prisma.canteen.findFirst({ where: { vendorId } })
    if (!canteen) {
        return { success: false, error: 'No canteen found for this vendor' }
    }

    // Delegate to OrderService
    const result = await OrderService.placeOrder({
        vendorId,
        canteenId: canteen.id,
        items: items.map(i => ({ 
            menuItemId: i.itemId, 
            quantity: i.quantity 
        })),
        source: 'COUNTER',
        fulfillmentType: fulfillmentType as 'DINE_IN' | 'TAKEAWAY', // Cast to strict type
        paymentMode: paymentMode as any, // OrderService needs updating to support 'HOLD' or map strict types
        idempotencyKey: `POS-${Date.now()}-${Math.random().toString(36).slice(2)}`, // Generate unique key for POS
        staffId: session.user.id
    })

    if (result.success) {
         revalidatePath('/vendor/terminal')
         return { success: true, orderId: result.orderId }
    } else {
        throw new Error('Order placement failed')
    }

  } catch (error: any) {
    console.error('Failed to create POS order:', error)
    return { success: false, error: error.message || 'Failed to create order' }
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'VENDOR') return { success: false, error: 'Unauthorized' }
    
    const vendorId = session.user.vendorId
    if (!vendorId) return { success: false, error: 'No vendor profile' }

    const ALLOWED_STATUSES = ['ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']
    if (!ALLOWED_STATUSES.includes(status)) {
        return { success: false, error: 'Invalid status' }
    }

    // Use updateMany to enforce vendor ownership in the query
    const result = await prisma.order.updateMany({
      where: { 
        id: orderId,
        vendorId: vendorId 
      },
      data: { status }
    })

    if (result.count === 0) {
        return { success: false, error: 'Order not found or unauthorized' }
    }

    revalidatePath('/vendor/terminal')
    return { success: true }
  } catch (error) {
    console.error('Failed to update status:', error)
    return { success: false, error: 'Failed to update status' }
  }
}

// -- MENU --

export async function upsertMenuItem(data: {
    id?: string
    name: string
    priceCents: number
    section: string
    isVegetarian: boolean
    available: boolean
    imageUrl?: string
    description?: string
    recipeItems?: { inventoryItemId: string; quantity: number }[]
}) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'VENDOR') return { success: false, error: 'Unauthorized' }
        const vendorId = session.user.vendorId!
        
        // Find or create section
        let sectionId: string | undefined
        if (data.section) {
             const section = await prisma.menuSection.findFirst({
                 where: { canteen: { vendorId: vendorId }, name: { equals: data.section, mode: 'insensitive' } }
             })
             if (section) sectionId = section.id
             else {
                 const canteen = await prisma.canteen.findFirst({ where: { vendorId } })
                 if (canteen) {
                     const newSection = await prisma.menuSection.create({
                         data: { canteenId: canteen.id, name: data.section }
                     })
                     sectionId = newSection.id
                 }
             }
        }

        const canteen = await prisma.canteen.findFirst({ where: { vendorId } })
        if (!canteen) return { success: false, error: 'No canteen found' }

        // Use transaction to handle Item + Recipe
        await prisma.$transaction(async (tx) => {
            let itemId = data.id

            if (data.id) {
                // Update - Verify ownership
                const existingItem = await tx.menuItem.findUnique({
                    where: { id: data.id },
                    include: { canteen: true }
                })
                
                if (!existingItem) throw new Error('Item not found')
                if (existingItem.canteen.vendorId !== vendorId) throw new Error('Unauthorized')
    
                await tx.menuItem.update({
                    where: { id: data.id },
                    data: {
                        name: data.name,
                        priceCents: data.priceCents,
                        sectionId,
                        isVegetarian: data.isVegetarian,
                        available: data.available,
                        imageUrl: data.imageUrl,
                        description: data.description
                    }
                })
            } else {
                const newItem = await tx.menuItem.create({
                    data: {
                        canteenId: canteen.id,
                        name: data.name,
                        priceCents: data.priceCents,
                        sectionId,
                        isVegetarian: data.isVegetarian,
                        available: data.available,
                        imageUrl: data.imageUrl,
                        description: data.description
                    }
                })
                itemId = newItem.id
            }

            // Handle Recipe
            if (data.recipeItems && itemId) {
                // 1. Find existing Recipe or Create
                // Simplest strategy: Delete existing items and recreate.
                
                // First, ensure Recipe exists
                let recipe = await tx.recipe.findUnique({ where: { menuItemId: itemId } })
                if (!recipe) {
                    recipe = await tx.recipe.create({ data: { menuItemId: itemId } })
                }

                // Delete old items
                await tx.recipeItem.deleteMany({ where: { recipeId: recipe.id } })

                // Create new items
                if (data.recipeItems.length > 0) {
                    await tx.recipeItem.createMany({
                        data: data.recipeItems.map(ri => ({
                            recipeId: recipe.id,
                            inventoryItemId: ri.inventoryItemId,
                            quantity: ri.quantity
                        }))
                    })
                }
            }
        })

        revalidatePath('/vendor/menu')
        revalidatePath('/vendor/terminal')
        return { success: true }
    } catch (error: any) {
        console.error('Upsert Item Error', error)
        return { success: false, error: error.message || 'Failed to save item' }
    }
}

export async function toggleItemAvailability(itemId: string, status: boolean) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'VENDOR') return { success: false, error: 'Unauthorized' }

        const vendorId = session.user.vendorId
        if (!vendorId) return { success: false, error: 'Vendor ID not found' }
        
        const item = await prisma.menuItem.findFirst({
            where: { id: itemId, canteen: { vendorId } }
        })
        if (!item) return { success: false, error: 'Menu item not found' }

        await prisma.menuItem.update({
            where: { id: itemId },
            data: { available: status }
        })
        revalidatePath('/vendor/menu')
        revalidatePath('/vendor/terminal') 
        return { success: true }
    } catch (error) {
        console.error('Toggle Item Error', error)
        return { success: false, error: 'Failed to toggle availability' }
    }
}

export async function deleteMenuItem(itemId: string) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'VENDOR') return { success: false, error: 'Unauthorized' }
        
        const vendorId = session.user.vendorId
        if (!vendorId) return { success: false, error: 'No vendor profile' }

        // 1. Fetch item to verify ownership
        const item = await prisma.menuItem.findUnique({
            where: { id: itemId },
            include: { canteen: true }
        })

        if (!item) {
             return { success: false, error: 'Item not found' }
        }

        // 2. Check if the item's canteen belongs to this vendor
        if (item.canteen.vendorId !== vendorId) {
             console.warn(`Unauthorized delete attempt by vendor ${vendorId} on item ${itemId}`)
             return { success: false, error: 'Unauthorized' }
        }

        // 3. Delete in Transaction (To clean up recipe)
        await prisma.$transaction(async (tx) => {
             // Find recipe
             const recipe = await tx.recipe.findUnique({ where: { menuItemId: itemId } })
             if (recipe) {
                 await tx.recipeItem.deleteMany({ where: { recipeId: recipe.id } })
                 await tx.recipe.delete({ where: { id: recipe.id } })
             }
             
             await tx.menuItem.delete({
                where: { id: itemId }
             })
        })
        
        revalidatePath('/vendor/menu')
        revalidatePath('/vendor/terminal')
        return { success: true }
    } catch (error) {
         console.error('Delete Item Error', error)
         return { success: false, error: 'Failed to delete item' }
    }
}


export async function updateInventoryQuantity(itemId: string, quantity: number) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'VENDOR') return { success: false, error: 'Unauthorized' }

    if (quantity < 0) return { success: false, error: 'Quantity must be non-negative' }

    const vendorId = session.user.vendorId
    if (!vendorId) return { success: false, error: 'No vendor profile' }

    // Enforce Vendor Mode
    try {
        await requireVendorMode(vendorId, VendorMode.FULL_POS)
    } catch (e: any) {
        return { success: false, error: e.message }
    }
    
    const item = await prisma.inventoryItem.findFirst({
      where: { id: itemId, vendorId }
    })
    if (!item) return { success: false, error: 'Inventory item not found' }

    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { quantity }
    })

    revalidatePath('/vendor/inventory')
    return { success: true }
  } catch (error) {
    console.error('Update Inventory Quantity Error:', error)
    return { success: false, error: 'Database error' }
  }
}

export async function createInventoryItem(vendorId: string, data: { name: string; category: string; unit: string; quantity: number; minThreshold: number; costPerUnit: number }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'VENDOR') return { success: false, error: 'Unauthorized' }

    // Enforce Vendor Mode
    try {
        await requireVendorMode(vendorId, VendorMode.FULL_POS)
    } catch (e: any) {
        return { success: false, error: e.message }
    }

    // Validation
    const name = data.name?.trim()
    if (!name) return { success: false, error: 'Name is required' }

    const quantity = Number(data.quantity)
    if (isNaN(quantity) || quantity < 0) return { success: false, error: 'Invalid quantity' }

    const minThreshold = Number(data.minThreshold)
    if (isNaN(minThreshold) || minThreshold < 0) return { success: false, error: 'Invalid minimum threshold' }

    const costPerUnit = Number(data.costPerUnit ?? 0)
    if (isNaN(costPerUnit) || costPerUnit < 0) return { success: false, error: 'Invalid cost per unit' }

    const VALID_UNITS = ['KG', 'GM', 'L', 'ML', 'PCS', 'PACK', 'BOX', 'DOZEN', 'CAN', 'BOTTLE']
    if (!VALID_UNITS.includes(data.unit?.toUpperCase())) {
        return { success: false, error: `Invalid unit. Allowed: ${VALID_UNITS.join(', ')}` }
    }

    const VALID_CATEGORIES = ['RAW MATERIAL', 'PACKAGING', 'READY TO EAT', 'PRODUCE', 'DAIRY', 'MEAT', 'GROCERY', 'BEVERAGES', 'CLEANING', 'BAKERY', 'SPICES', 'OTHER']
    if (!VALID_CATEGORIES.includes(data.category?.toUpperCase())) {
        return { success: false, error: `Invalid category. Allowed: ${VALID_CATEGORIES.join(', ')}` }
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        vendorId,
        name,
        category: data.category.toUpperCase(),
        unit: data.unit.toUpperCase(),
        quantity,
        minThreshold,
        costPerUnit
      }
    })

    revalidatePath('/vendor/inventory')
    return { success: true, data: newItem }
  } catch (error) {
    console.error('Create Inventory Error:', error)
    return { success: false, error: 'Database error' }
  }
}

export async function updateInventoryItem(itemId: string, data: { name?: string; category?: string; unit?: string; quantity?: number; minThreshold?: number; costPerUnit?: number }) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'VENDOR') return { success: false, error: 'Unauthorized' }
    
    const vendorId = session.user.vendorId
    if (!vendorId) return { success: false, error: 'No vendor profile' }

    // Enforce Vendor Mode
    try {
        await requireVendorMode(vendorId, VendorMode.FULL_POS)
    } catch (e: any) {
        return { success: false, error: e.message }
    }

    // Enforce ownership
    const existing = await prisma.inventoryItem.findFirst({
      where: { id: itemId, vendorId }
    })
    
    if (!existing) {
        return { success: false, error: 'Item not found or unauthorized' }
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data
    })

    revalidatePath('/vendor/inventory')
    return { success: true, data: updatedItem }
  } catch (error) {
    console.error('Update Inventory Error:', error)
    return { success: false, error: 'Database error' }
  }
}

export async function deleteInventoryItem(itemId: string) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'VENDOR') return { success: false, error: 'Unauthorized' }
        
    const vendorId = session.user.vendorId
    if (!vendorId) return { success: false, error: 'No vendor profile' }

    // Enforce Vendor Mode
    try {
        await requireVendorMode(vendorId, VendorMode.FULL_POS)
    } catch (e: any) {
        return { success: false, error: e.message }
    }

        // Use deleteMany to ensure we only delete if the vendor owns this item
        const result = await prisma.inventoryItem.deleteMany({
            where: { 
                id: itemId, 
                vendorId: vendorId 
            }
        })
        
        if (result.count === 0) {
           return { success: false, error: 'Unauthorized' }
        }

        revalidatePath('/vendor/inventory')
        return { success: true }
    } catch (error) {
        console.error('Delete Inventory Error', error)
        return { success: false, error: 'Database error' }
    }
}



// -- SETTINGS --

export async function updateCanteenStatus(canteenId: string, isOpen: boolean) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'VENDOR') return { success: false, error: 'Unauthorized' }
    
    const vendorId = session.user.vendorId
    if (!vendorId) return { success: false, error: 'No vendor profile' }

    // Use updateMany to ensure we only update if the vendor owns this canteen
    const result = await prisma.canteen.updateMany({
      where: { 
        id: canteenId,
        vendorId: vendorId
      },
      data: { manualIsOpen: isOpen, autoMode: false }
    })

    if (result.count === 0) {
        return { success: false, error: 'Canteen not found or unauthorized' }
    }

    revalidatePath('/vendor/settings')
    return { success: true }
  } catch (error) {
    console.error('Update Canteen Status Error:', error)
    return { success: false, error: 'Database error' }
  }
}

export async function updateVendorProfile(vendorId: string, data: { name: string; phone: string | null }) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'VENDOR' || session.user.vendorId !== vendorId) {
            return { success: false, error: 'Unauthorized' }
        }

        await prisma.vendor.update({
            where: { id: vendorId },
            data: {
                name: data.name,
                phone: data.phone,
            }
        })
        
        revalidatePath('/vendor/settings')
        return { success: true }
    } catch (error) {
        console.error('Update Vendor Profile Error:', error)
        return { success: false, error: 'Database error' }
    }
}

export interface DaySchedule {
    isOpen: boolean
    openTime?: string
    closeTime?: string
}

export interface WeeklySchedule {
    monday: DaySchedule
    tuesday: DaySchedule
    wednesday: DaySchedule
    thursday: DaySchedule
    friday: DaySchedule
    saturday: DaySchedule
    sunday: DaySchedule
}

export async function updateCanteenSchedule(canteenId: string, weeklySchedule: WeeklySchedule) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'VENDOR') return { success: false, error: 'Unauthorized' }

        // Runtime validation
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
        for (const day of days) {
            const schedule = weeklySchedule[day]
            if (!schedule) {
                return { success: false, error: `Missing schedule for ${day}` }
            }
            if (typeof schedule.isOpen !== 'boolean') {
                return { success: false, error: `Invalid isOpen status for ${day}` }
            }
        }

        const vendorId = session.user.vendorId
        if (!vendorId) return { success: false, error: 'No vendor profile' }
        
        const canteen = await prisma.canteen.findFirst({ where: { id: canteenId, vendorId } })
        if (!canteen) return { success: false, error: 'Canteen not found' }

        await prisma.canteen.update({
            where: { id: canteenId },
            data: { weeklySchedule: weeklySchedule as unknown as Prisma.InputJsonValue }
        })

        revalidatePath('/vendor/settings')
        return { success: true }
    } catch (error) {
        console.error('Update Schedule Error:', error)
        return { success: false, error: 'Database error' }
    }
}

export async function updateCanteenSettings(canteenId: string, data: { location?: string; notificationPhones?: string[]; whatsappEnabled?: boolean }) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'VENDOR') return { success: false, error: 'Unauthorized' }

        const vendorId = session.user.vendorId
        if (!vendorId) return { success: false, error: 'No vendor profile' }
        
        const canteen = await prisma.canteen.findFirst({ where: { id: canteenId, vendorId } })
        if (!canteen) return { success: false, error: 'Canteen not found' }

        await prisma.canteen.update({
            where: { id: canteenId },
            data: {
                ...(data.location !== undefined && { location: data.location }),
                ...(data.notificationPhones !== undefined && { notificationPhones: data.notificationPhones }),
            }
        })

        if (data.whatsappEnabled !== undefined && vendorId) {
            await prisma.vendor.update({
                where: { id: vendorId },
                data: { whatsappEnabled: data.whatsappEnabled }
            })
        }

        revalidatePath('/vendor/settings')
        return { success: true }
    } catch (error) {
        console.error('Update Settings Error:', error)
        return { success: false, error: 'Database error' }
    }
}
