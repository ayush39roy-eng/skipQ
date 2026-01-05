// Check if vendor location is saved in database
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkVendor() {
  const vendor = await prisma.vendor.findFirst({
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      geofenceRadiusMeters: true
    }
  })
  
  if (!vendor) {
    console.log('❌ No vendor found')
    return
  }
  
  console.log('\n📍 VENDOR LOCATION:\n')
  console.log('Vendor:', vendor.name)
  console.log('Latitude:', vendor.latitude ?? 'NOT SET')
  console.log('Longitude:', vendor.longitude ?? 'NOT SET')
  console.log('Geofence Radius:', vendor.geofenceRadiusMeters ? `${vendor.geofenceRadiusMeters}m` : 'NOT SET')
  
  if (vendor.latitude && vendor.longitude) {
    console.log('\n✅ Vendor location is configured!')
    console.log('🎉 Geofencing is ready to work!')
  } else {
    console.log('\n⚠️  Vendor location not set yet')
  }
  
  await prisma.$disconnect()
}

checkVendor().catch(console.error)
