import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- DEBUGGING VENDOR DATA ---')

  // 1. Check Vendors
  const vendors = await prisma.user.findMany({
    where: { role: 'VENDOR' },
    select: { id: true, name: true, email: true, vendorId: true }
  })
  
  console.log(`\n1. Found ${vendors.length} Vendors:`)
  vendors.forEach(v => {
    console.log(`   - [${v.name}] ID: ${v.id}, VendorRefID: ${v.vendorId || 'NULL (!!!)'}`)
  })

  // 2. Check Canteens
  const canteens = await prisma.canteen.findMany({
    include: { menuItems: { select: { id: true } } }
  })

  console.log(`\n2. Found ${canteens.length} Canteens:`)
  canteens.forEach(c => {
    console.log(`   - [${c.name}] ID: ${c.id}, VendorID: ${c.vendorId}, Items: ${c.menuItems.length}`)
  })

  // 3. Diagnosis
  console.log('\n--- DIAGNOSIS ---')
  if (vendors.length > 0) {
      const v = vendors[0]
      if (!v.vendorId) {
          console.error(`[CRITICAL] Vendor user ${v.name} has no 'vendorId' linked in the User table!`)
          console.error(`This explains why 'session.user.vendorId' is null/undefined.`)
      } else {
          const canteen = canteens.find(c => c.vendorId === v.vendorId)
          if (!canteen) {
              console.error(`[CRITICAL] VendorRefID ${v.vendorId} matches NO Canteen.`)
          } else if (canteen.menuItems.length === 0) {
              console.error(`[CRITICAL] Canteen exists but has 0 items.`)
          } else {
              console.log(`[OK] Data seems linked for vendor ${v.name}. check session token logic.`)
          }
      }
  } else {
      console.error(`[CRITICAL] No Vendor users found in DB.`)
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
