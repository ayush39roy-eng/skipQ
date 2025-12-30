
const { prisma } = require('../src/lib/prisma')

async function main() {
  console.log('--- Listing All Vendors and Modes ---')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vendors = await (prisma.vendor as any).findMany({
      select: { id: true, name: true, mode: true }
  })
  
  console.table(vendors)

  // Force update ALL to FULL_POS to unblock user
  console.log('--- Forcing ALL vendors to FULL_POS ---')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (prisma.vendor as any).updateMany({
      data: { mode: 'FULL_POS' } 
  })
  console.log(`Updated ${result.count} vendors to FULL_POS`)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vendorsAfter = await (prisma.vendor as any).findMany({ select: { id: true, name: true, mode: true } })
  console.table(vendorsAfter)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
