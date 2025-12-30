
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Inspecting Data Types & Sorting...')

  const result: any = await prisma.$runCommandRaw({
      find: "Order",
      filter: {},
      sort: { createdAt: -1 },
      limit: 15,
      projection: { _id: 1, canteenId: 1, createdAt: 1 }
  })

  const orders = result.cursor?.firstBatch || []
  
  for (const o of orders) {
      const oid = o._id.$oid || String(o._id)
      const cid = o.canteenId
      const created = o.createdAt

      let cidType = typeof cid
      let cidVal = cid
      if (cid && cid.$oid) {
          cidType = "ObjectId (Wrapped)"
          cidVal = cid.$oid
      } else if (cid && typeof cid === 'object') { // real ObjectId?
          cidType = "Object (Unknown)"
      }

      console.log(`Order ${oid}`)
      console.log(`  > CreatedAt: ${JSON.stringify(created)} (Type: ${typeof created})`)
      console.log(`  > CanteenId: ${cidVal} (Type: ${cidType})`)
      console.log('---')
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
