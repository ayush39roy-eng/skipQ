const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const order = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { payment: true }
  })

  console.log('Order Status:', order.status)
  console.log('Payment Status:', order.payment?.status)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
