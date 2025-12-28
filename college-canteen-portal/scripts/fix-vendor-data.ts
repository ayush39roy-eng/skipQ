import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('--- FIXING VENDOR DATA ---')

  const email = 'vendor@college.local'
  const password = process.env.VENDOR_PASSWORD || 'vendor123'
  const passwordHash = await bcrypt.hash(password, 10)

  // 1. Ensure User Exists
  console.log(`1. Upserting User: ${email}`)
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'VENDOR' }, // Ensure role is VENDOR
    create: {
      email,
      name: 'Vendor User',
      passwordHash,
      role: 'VENDOR'
    }
  })

  // 2. Ensure Vendor Profile Exists
  // We check if the user already has a vendorId
  let vendorId = user.vendorId
  let vendor

  if (vendorId) {
      console.log(`2. User already linked to Vendor ID: ${vendorId}. Verifying...`)
      vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
  }

  if (!vendor) {
      console.log(`   - Vendor profile missing or not linked. Creating new one.`)
      vendor = await prisma.vendor.create({
          data: { name: 'Main Campus Vendor', whatsappEnabled: true }
      })
      vendorId = vendor.id
      
      // Link back to user
      await prisma.user.update({
          where: { id: user.id },
          data: { vendorId: vendor.id }
      })
      console.log(`   - Linked User to Vendor ID: ${vendor.id}`)
  }

  // 3. Ensure Canteen Exists
  console.log(`3. Checking Canteens for Vendor: ${vendor!.name}`)
  let canteen = await prisma.canteen.findFirst({
      where: { vendorId: vendor!.id }
  })

  if (!canteen) {
     console.log(`   - No canteen found. Creating 'Central Canteen'...`)
     canteen = await prisma.canteen.create({
         data: {
             name: 'Central Canteen',
             location: 'Student Center',
             vendorId: vendor!.id,
             // Weekly schedule default
         }
     })
  } else {
     console.log(`   - Found Canteen: ${canteen.name}`)
  }

  // 4. Ensure Menu Items Exist
  const itemCount = await prisma.menuItem.count({ where: { canteenId: canteen.id } })
  console.log(`4. Canteen has ${itemCount} items.`)

  if (itemCount === 0) {
      console.log(`   - Seeding default items...`)
      await prisma.menuItem.createMany({
          data: [
              { canteenId: canteen.id, name: 'Veg Burger', priceCents: 4500, available: true, sectionId: undefined },
              { canteenId: canteen.id, name: 'Cheese Sandwich', priceCents: 6000, available: true, sectionId: undefined },
              { canteenId: canteen.id, name: 'Masala Dosa', priceCents: 7500, available: true, sectionId: undefined },
              { canteenId: canteen.id, name: 'Cold Coffee', priceCents: 4000, available: true, sectionId: undefined },
          ]
      })
      console.log(`   - Added 4 items.`)
  }

  // 5. Ensure Orders (Optional: for testing dashboard)
  const orderCount = await prisma.order.count({ where: { vendorId: vendor!.id } })
  if (orderCount === 0) {
      console.log(`5. Seeding sample order...`)
      // Need items first
      const item = await prisma.menuItem.findFirst({ where: { canteenId: canteen.id } })
      if (item) {
          await prisma.order.create({
              data: {
                  vendorId: vendor!.id,
                  canteenId: canteen.id,
                  status: 'PENDING',
                  totalCents: item.priceCents,
                  fulfillmentType: 'TAKEAWAY',
                  items: {
                      create: {
                          menuItemId: item.id,
                          quantity: 1,
                          priceCents: item.priceCents
                      }
                  }
              }
          })
      }
  }

  console.log('\n--- SUCCESS ---')
  console.log(`Login Credentials:`)
  console.log(`Email: ${email}`)
  console.log(`Password: [HIDDEN]`)
  console.log('----------------')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
