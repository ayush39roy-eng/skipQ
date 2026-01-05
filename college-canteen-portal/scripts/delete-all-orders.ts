// Delete ALL orders from the database
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteAllOrders() {
  console.log('⚠️  DELETING ALL ORDERS...')
  
  // Delete all order items first (foreign key constraint)
  const itemsDeleted = await prisma.orderItem.deleteMany({})
  console.log(`✅ Deleted ${itemsDeleted.count} order items`)
  
  // Delete all ledger entries
  const ledgerDeleted = await prisma.ledgerEntry.deleteMany({})
  console.log(`✅ Deleted ${ledgerDeleted.count} ledger entries`)
  
  // Delete all payments
  const paymentsDeleted = await prisma.payment.deleteMany({})
  console.log(`✅ Deleted ${paymentsDeleted.count} payments`)
  
  // Delete all orders
  const ordersDeleted = await prisma.order.deleteMany({})
  console.log(`✅ Deleted ${ordersDeleted.count} orders`)

  // Delete all settlements
  const settlementsDeleted = await prisma.settlementBatch.deleteMany({})
  console.log(`✅ Deleted ${settlementsDeleted.count} settlements`)
  
  console.log('\n🎉 ALL ORDERS DELETED! Database is clean.')
  
  await prisma.$disconnect()
}

deleteAllOrders()
  .catch(console.error)
