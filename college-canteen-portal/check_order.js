const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find the latest order
  const order = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { payment: true }
  })

  if (!order) {
    console.log('No order found')
    return
  }

  console.log('Order found:', order.id)

  let externalOrderId = 'order_test_' + Math.random().toString(36).substring(7)

  if (!order.payment) {
    console.log('Creating dummy payment record...')
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amountCents: order.totalCents,
        paymentLink: 'http://dummy',
        provider: 'razorpay',
        externalOrderId: externalOrderId,
        status: 'PENDING'
      }
    })
  } else {
    externalOrderId = order.payment.externalOrderId || externalOrderId
    if (!order.payment.externalOrderId) {
        await prisma.payment.update({
            where: { id: order.payment.id },
            data: { externalOrderId }
        })
    }
  }

  console.log('External Order ID:', externalOrderId)
  
  const payload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_' + Math.random().toString(36).substring(7),
          order_id: externalOrderId
        }
      }
    }
  }

  const fs = require('fs')
  fs.writeFileSync('payload.json', JSON.stringify(payload))

  const cmd = `curl -s -X POST http://localhost:3000/api/payment/webhook -H "Content-Type: application/json" -d @payload.json`
  console.log('Executing:', cmd)
  
  const { exec } = require('child_process')
  exec(cmd, (error, stdout, stderr) => {
      if (error) {
          console.error(`exec error: ${error}`)
          return
      }
      console.log(`Response: ${stdout}`)
      if (stderr) console.error(`stderr: ${stderr}`)
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
