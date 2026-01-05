// Check the latest order with geofencing data
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkLatestOrder() {
  const latestOrder = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      canteen: { select: { name: true } },
      vendor: { 
        select: { 
          name: true, 
          latitude: true, 
          longitude: true, 
          geofenceRadiusMeters: true 
        } 
      },
      items: {
        include: {
          menuItem: { select: { name: true, priceCents: true } }
        }
      }
    }
  })
  
  if (!latestOrder) {
    console.log('❌ No orders found in database')
    return
  }
  
  console.log('\n📦 LATEST ORDER DETAILS:\n')
  console.log('Order ID:', latestOrder.id)
  console.log('Canteen:', latestOrder.canteen?.name || 'N/A')
  console.log('Vendor:', latestOrder.vendor?.name || 'N/A')
  console.log('Status:', latestOrder.status)
  console.log('Total:', `₹${(latestOrder.totalCents / 100).toFixed(2)}`)
  console.log('Created:', latestOrder.createdAt.toLocaleString())
  
  console.log('\n🌍 GEOFENCING DATA:\n')
  console.log('📍 User Location:')
  console.log('  Latitude:', latestOrder.userLatitude ?? 'NOT PROVIDED')
  console.log('  Longitude:', latestOrder.userLongitude ?? 'NOT PROVIDED')
  console.log('  Accuracy:', latestOrder.locationAccuracy ? `${latestOrder.locationAccuracy}m` : 'N/A')
  
  console.log('\n📍 Vendor Location:')
  console.log('  Latitude:', latestOrder.vendor?.latitude ?? 'NOT SET')
  console.log('  Longitude:', latestOrder.vendor?.longitude ?? 'NOT SET')
  console.log('  Geofence Radius:', latestOrder.vendor?.geofenceRadiusMeters ? `${latestOrder.vendor.geofenceRadiusMeters}m` : 'NOT SET')
  
  console.log('\n📏 DISTANCE & CLASSIFICATION:\n')
  console.log('  Distance from Vendor:', latestOrder.distanceFromVendorMeters ? `${latestOrder.distanceFromVendorMeters}m` : 'NOT CALCULATED')
  console.log('  Order Type:', latestOrder.orderType)
  
  if (latestOrder.orderType === 'SELF_ORDER') {
    console.log('  ✅ SELF_ORDER - Visible to vendor')
  } else {
    console.log('  ⚠️  PRE_ORDER - Hidden from vendor')
  }
  
  console.log('\n📝 ORDER ITEMS:')
  latestOrder.items.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.menuItem.name} x${item.quantity} - ₹${(item.priceCents / 100).toFixed(2)}`)
  })
  
  await prisma.$disconnect()
}

checkLatestOrder().catch(console.error)
