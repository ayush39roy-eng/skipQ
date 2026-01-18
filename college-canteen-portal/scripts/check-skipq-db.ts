
import { PrismaClient } from '@prisma/client'

// Override env for this process
process.env.DATABASE_URL = "mongodb+srv://skipq39_db_user:yMKv2QCdupZiUguA@skipq.xrkoye3.mongodb.net/skipq?retryWrites=true&w=majority&appName=SKIPQ"

const prisma = new PrismaClient()

async function main() {
  console.log('Connecting to database: skipq ...')
  console.log('Fetching Canteens...')
  try {
      const canteens = await prisma.canteen.findMany({
        include: { vendor: true }
      })
      
      if (canteens.length === 0) {
          console.log('No canteens found in skipq DB.')
      } else {
          console.log(`Found ${canteens.length} Canteens in skipq DB:`)
          canteens.forEach(c => {
              console.log(`- ID: ${c.id}`)
              console.log(`  Name: ${c.name}`)
              console.log(`  Vendor: ${c.vendor?.name}`)
              console.log('---')
          })
      }
  } catch (e) {
      console.error('Error connecting or fetching:', e)
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
