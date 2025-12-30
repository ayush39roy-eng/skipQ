
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Running pure raw cleanup...')

  // 1. Fetch valid Canteen IDs
  const canteens = await prisma.canteen.findMany({ select: { id: true } })
  const validCanteenIds = new Set(canteens.map(c => c.id))
  console.log(`Valid Canteens: ${canteens.length}`)

  // 2. Fetch all Orders (Raw)
  // Note: Mongo returns _id as ObjectId usually, we need to handle that.
  // Prisma runCommandRaw returns JSON where ObjectId might be string or { $oid: ... }
  const result: any = await prisma.$runCommandRaw({
      find: "Order",
      filter: {},
      projection: { _id: 1, canteenId: 1 }
  })

  // result.cursor.firstBatch contains the items
  const orders = result.cursor.firstBatch
  console.log(`Total Orders (Raw): ${orders.length}`)

  let badIds: string[] = []

  for (const o of orders) {
      const oid = o._id ? (typeof o._id === 'string' ? o._id : o._id.$oid) : null
      const canteenId = o.canteenId

      if (!canteenId || !validCanteenIds.has(canteenId)) {
          console.log(`Bad Order: ${oid} has canteenId: ${canteenId}`)
          if (oid) badIds.push(oid)
      }
  }

  console.log(`Found ${badIds.length} bad orders.`)

  if (badIds.length > 0) {
       // Convert string IDs back to ObjectId format for deletion?
       // Prisma raw command expects { $oid: hex } for ObjectId matching?
       // Actually, let's try strict string match first in delete command
       
       const deletes = badIds.map(id => ({
           q: { _id: { $oid: id } },
           limit: 1
       }))

       const delResult = await prisma.$runCommandRaw({
           delete: "Order",
           deletes: deletes
       })
       console.log('Delete result:', delResult)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
