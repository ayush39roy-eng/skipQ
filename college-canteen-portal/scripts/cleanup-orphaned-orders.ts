// Quick script to clean up orphaned orders (orders without valid canteens)
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupOrphanedOrders() {
  console.log('Finding orphaned orders...')
  
  // Get all orders
  const allOrders = await prisma.order.findMany({
    select: {
      id: true,
      canteenId: true,
    }
  })
  
  console.log(`Total orders: ${allOrders.length}`)
  
  // Find orphaned ones
  const orphaned = []
  for (const order of allOrders) {
    const canteen = await prisma.canteen.findUnique({
      where: { id: order.canteenId }
    })
    if (!canteen) {
      orphaned.push(order.id)
      console.log(`❌ Orphaned order: ${order.id} (canteen ${order.canteenId} not found)`)
    }
  }
  
  if (orphaned.length > 0) {
    console.log(`\nDeleting ${orphaned.length} orphaned orders...`)
    const result = await prisma.order.deleteMany({
      where: {
        id: { in: orphaned }
      }
    })
    console.log(`✅ Deleted ${result.count} orphaned orders`)
  } else {
    console.log('✅ No orphaned orders found!')
  }
  
  await prisma.$disconnect()
}

cleanupOrphanedOrders()
  .catch(console.error)
