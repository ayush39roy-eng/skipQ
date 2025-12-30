
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting granular diagnosis...')

  // 1. Get ALL raw Canteens
  const canteenResult: any = await prisma.$runCommandRaw({
      find: "Canteen",
      filter: {},
      projection: { _id: 1 }
  })
  const validCanteenIds = new Set<string>()
  
  if (canteenResult.cursor?.firstBatch) {
      canteenResult.cursor.firstBatch.forEach((c: any) => {
          const id = c._id.$oid || c._id
          validCanteenIds.add(String(id))
      })
  }
  console.log(`Found ${validCanteenIds.size} valid canteens.`)

  // 2. Get ALL raw Orders
  // We paginate to be safe, though not strictly necessary for 100s of records
  const orderResult: any = await prisma.$runCommandRaw({
      find: "Order",
      filter: {},
      projection: { _id: 1, canteenId: 1 }
  })
  
  const orders = orderResult.cursor?.firstBatch || []
  console.log(`Found ${orders.length} orders total.`)

  const badOrderIds: string[] = []

  for (const o of orders) {
      const oid = o._id.$oid || o._id
      const cid = o.canteenId

      // Case 1: Missing cid
      if (!cid) {
          console.log(`Order ${oid} MISSING canteenId (Value: ${cid})`)
          badOrderIds.push(oid)
          continue
      }

      // Case 2: Cid is object (legacy?) or string
      // In Mongo, it might be stored as string or ObjectId
      let cidStr = typeof cid === 'string' ? cid : (cid.$oid ? cid.$oid : String(cid))
      
      if (!validCanteenIds.has(cidStr)) {
          console.log(`Order ${oid} HAS DANGLING canteenId: ${cidStr}`)
          badOrderIds.push(oid)
      }
  }

  console.log(`Summary: Found ${badOrderIds.length} corrupt orders.`)

  if (badOrderIds.length > 0) {
      console.log('DELETING CORRUPT ORDERS...')
      // Delete one by one to count success
      let deleted = 0
      for (const badId of badOrderIds) {
          const res = await prisma.$runCommandRaw({
              delete: "Order",
              deletes: [
                  { q: { _id: { $oid: badId } }, limit: 1 }
              ]
          })
          deleted++
      }
      console.log(`Successfully invoked delete for ${deleted} orders.`)
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
