
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fetching Canteens...')
  const canteens = await prisma.canteen.findMany({
    include: { vendor: true }
  })
  
  if (canteens.length === 0) {
      console.log('No canteens found.')
  } else {
      console.log('Found Canteens:')
      canteens.forEach(c => {
          console.log(`- ID: ${c.id}`)
          console.log(`  Name: ${c.name}`)
          console.log(`  Vendor: ${c.vendor?.name} (ID: ${c.vendorId})`)
          console.log(`  Location: ${c.location}`)
          console.log('---')
      })
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
