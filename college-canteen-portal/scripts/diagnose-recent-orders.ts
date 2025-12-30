
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Diagnosing RECENT orders (Top 20)...')

  // 1. Fetch valid Canteen IDs
  const rawCanteens: any = await prisma.$runCommandRaw({
      find: "Canteen",
      filter: {},
      projection: { _id: 1 }
  })
  const validCanteenIds = new Set<string>()
  rawCanteens.cursor?.firstBatch?.forEach((c: any) => {
       const id = c._id.$oid || String(c._id)
       validCanteenIds.add(id)
  })
  console.log(`Valid Canteen IDs (${validCanteenIds.size}):`, Array.from(validCanteenIds))

  // 2. Fetch Recent Orders (Raw Sort)
  const rawOrders: any = await prisma.$runCommandRaw({
      find: "Order",
      filter: {},
      sort: { createdAt: -1 },
      limit: 20
  })

  const orders = rawOrders.cursor?.firstBatch || []
  console.log(`Inspecting ${orders.length} recent orders...`)

  for (const o of orders) {
      const oid = o._id.$oid || String(o._id)
      const cid = o.canteenId
      
      console.log(`Order ${oid} | CanteenId Raw: ${JSON.stringify(cid)}`)

      let cidStr = ''
      if (!cid) {
          cidStr = 'MISSING'
      } else if (typeof cid === 'string') {
          cidStr = cid
      } else if (cid.$oid) {
          cidStr = cid.$oid
      } else {
          cidStr = String(cid)
      }

      if (!validCanteenIds.has(cidStr)) {
          console.error(`!!! CORRUPT ORDER FOUND !!!`)
          console.error(`ID: ${oid}`)
          console.error(`Invalid CanteenId: ${cidStr}`)
          
          // Auto-delete
          console.log('Deleting...')
          await prisma.$runCommandRaw({
              delete: "Order",
              deletes: [ { q: { _id: { $oid: oid } }, limit: 1 } ]
          })
          console.log('Deleted.')
      } else {
          console.log(`OK: ${oid} -> ${cidStr}`)
      }
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
