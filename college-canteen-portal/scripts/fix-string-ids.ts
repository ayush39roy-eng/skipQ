
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing String-typed canteenIds...')

  // 1. Fetch Orders (Raw)
  const result: any = await prisma.$runCommandRaw({
      find: "Order",
      filter: {},
      projection: { _id: 1, canteenId: 1, vendorId: 1 }
  })
  
  const orders = result.cursor?.firstBatch || []
  let fixedCount = 0

  for (const o of orders) {
      const oid = o._id.$oid || o._id
      const cid = o.canteenId
      
      // If canteenId is just a string (and valid hex), it's likely the wrong type in DB
      // A proper ObjectId usually comes back from runCommandRaw as { $oid: "..." }
      if (typeof cid === 'string' && cid.length === 24 && /^[0-9a-fA-F]{24}$/.test(cid)) {
          console.log(`Fixing Order ${oid}: canteenId "${cid}" (String) -> ObjectId`)
          
          await prisma.$runCommandRaw({
              update: "Order",
              updates: [
                  {
                      q: { _id: { $oid: oid } },
                      u: { 
                          $set: { 
                              canteenId: { $oid: cid } 
                          } 
                      }
                  }
              ]
          })
          fixedCount++
      }
      
      // Also check vendorId just in case
      const vid = o.vendorId
      if (typeof vid === 'string' && vid.length === 24 && /^[0-9a-fA-F]{24}$/.test(vid)) {
          console.log(`Fixing Order ${oid}: vendorId "${vid}" (String) -> ObjectId`)
           await prisma.$runCommandRaw({
              update: "Order",
              updates: [
                  {
                      q: { _id: { $oid: oid } },
                      u: { 
                          $set: { 
                              vendorId: { $oid: vid } 
                          } 
                      }
                  }
              ]
          })
      }
  }

  console.log(`Fixed ${fixedCount} orders involved in type mismatch.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
