import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- DEBUGGING TERMINAL QUERY ---')
  const email = 'vendor@college.local'
  
  // 1. Get Vendor ID mimicking Session
  const user = await prisma.user.findUnique({ 
      where: { email },
      include: { vendor: true }
  })

  if (!user || !user.vendorId) {
      console.error("User or VendorID missing!")
      return
  }

  const vendorId = user.vendorId
  console.log(`User: ${user.email}, VendorID: ${vendorId}`)

  // 2. Run EXACT Query from TerminalPage
  console.log("Running Query...")
  const items = await prisma.menuItem.findMany({
      where: { 
        canteen: { vendorId: vendorId },
      },
      select: {
        id: true,
        name: true,
        canteenId: true,
        canteen: { select: { name: true, vendorId: true } }
      }
  })

  console.log(`Found ${items.length} Items:`)
  items.forEach(i => {
      console.log(` - ${i.name} (Canteen: ${i.canteen.name}, Vendor: ${i.canteen.vendorId})`)
  })

  // 3. Check Canteens
  const canteens = await prisma.canteen.findMany({
      where: { vendorId: vendorId }
  })
  console.log(`\nCanteens for Vendor ${vendorId}:`)
  canteens.forEach(c => console.log(` - ${c.name} (ID: ${c.id})`))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
