import { Prisma } from '@prisma/client'

export const InventoryService = {
  /**
   * Decrements stock for a list of menu items based on their recipes.
   * STRICTLY TRANSACTIONAL: Must be called inside a prisma.$transaction.
   */
  async decrementStock(
    tx: Prisma.TransactionClient,
    vendorId: string,
    items: { menuItemId: string; quantity: number }[],
    orderId: string,
    performedBy: string = 'SYSTEM'
  ) {
    // 1. Collect all Menu Item IDs
    const menuItemIds = items.map(i => i.menuItemId)

    // 2. Fetch Recipes
    // We need to know which inventory items are consumed by these menu items
    const recipes = await tx.recipe.findMany({
      where: {
        menuItemId: { in: menuItemIds }
      },
      include: {
        items: true // RecipeItems
      }
    })

    // Map menuItemId -> RecipeItems
    const recipeMap = new Map<string, { inventoryItemId: string; quantity: number }[]>()
    
    recipes.forEach(r => {
      recipeMap.set(r.menuItemId, r.items)
    })

    // 3. Calculate Total Consumption per Inventory Item
    // Map<InventoryItemId, TotalAmountToDecrement>
    const consumptionMap = new Map<string, number>()

    for (const item of items) {
      const recipeItems = recipeMap.get(item.menuItemId)
      if (!recipeItems) continue // No recipe, no inventory deduction

      for (const ri of recipeItems) {
        const current = consumptionMap.get(ri.inventoryItemId) || 0
        consumptionMap.set(ri.inventoryItemId, current + (ri.quantity * item.quantity))
      }
    }

    // 4. Perform Decrements & Updates
    for (const [invId, amount] of consumptionMap.entries()) {
      // A. Decrement Inventory Item
      // We allow negative stock (it represents a discrepancy/debt to reality), 
      // but we will auto-disable availability if it drops below 0 for FUTURE orders.
      const updatedItem = await tx.inventoryItem.update({
        where: { id: invId },
        data: {
          quantity: { decrement: amount }
        }
      })

      // B. Create Audit Log
      await tx.inventoryLog.create({
        data: {
          inventoryItemId: invId,
          changeAmount: -amount, // Negative because we are consuming
          reason: 'ORDER',
          referenceId: orderId,
          performedBy: performedBy
        }
      })

      // C. Auto-switch availability if Out of Stock
      // If stock drops below 0 (or a specific threshold?), we might want to disable linked menu items.
      // For now, let's keep it simple: if quantity <= 0, we can flag it.
      // However, disabling menu items is complex because multiple items might share ingredients.
      // To ensure correctness, we'd need to find ALL menu items using this ingredient.
      // This might be too heavy for the transaction. 
      // STRATEGY: We let it go negative. The specific "Check Availability" availability check service 
      // should run before order placement or periodically.
    }
  },

  async logAdjustment(
    tx: Prisma.TransactionClient,
    inventoryItemId: string,
    changeAmount: number,
    reason: 'MANUAL' | 'WASTAGE' | 'RESTOCK',
    performedBy: string,
    referenceId?: string
  ) {
    await tx.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { quantity: { increment: changeAmount } }
    })

    await tx.inventoryLog.create({
      data: {
        inventoryItemId,
        changeAmount,
        reason,
        performedBy,
        referenceId
      }
    })
  }
}
