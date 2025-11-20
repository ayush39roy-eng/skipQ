import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Admin
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'skipq@dtu29'
  const adminPass = await bcrypt.hash(adminPassword, 10)
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (admin) {
    admin = await prisma.user.update({
      where: { id: admin.id },
      data: { email: 'admin@skipq.live', name: 'Admin', passwordHash: adminPass, role: 'ADMIN' },
    })
  } else {
    admin = await prisma.user.create({
      data: { email: 'admin@skipq.live', name: 'Admin', passwordHash: adminPass, role: 'ADMIN' },
    })
  }

  // Vendor and canteen
  const vendorPass = await bcrypt.hash('vendor123', 10)
  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@college.local' },
    update: {},
    create: { email: 'vendor@college.local', name: 'Vendor User', passwordHash: vendorPass, role: 'VENDOR' },
  })
  const vendor = await prisma.vendor.create({ data: { name: 'Main Vendor' } })
  await prisma.user.update({ where: { id: vendorUser.id }, data: { vendorId: vendor.id } })

  const canteen = await prisma.canteen.create({
    data: {
      name: 'Central Canteen',
      location: 'Main Building',
      vendorId: vendor.id,
      menuItems: {
        create: [
          { name: 'Veg Sandwich', priceCents: 5000, imageUrl: 'https://picsum.photos/seed/sandwich/400/300' },
          { name: 'Cold Coffee', priceCents: 3000, imageUrl: 'https://picsum.photos/seed/coffee/400/300' },
          { name: 'Chicken Roll', priceCents: 7000, imageUrl: 'https://picsum.photos/seed/roll/400/300' },
        ],
      },
    },
  })

  // Regular user
  const userPass = await bcrypt.hash('user123', 10)
  await prisma.user.upsert({
    where: { email: 'student@college.local' },
    update: {},
    create: { email: 'student@college.local', name: 'Student', passwordHash: userPass, role: 'USER' },
  })

  console.log('Seeded:', { admin: admin.email, vendor: vendorUser.email, canteen: canteen.name })
}

main().finally(async () => {
  await prisma.$disconnect()
})
