
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Cleaning up orders and payments...')
    await prisma.ledgerEntry.deleteMany({
        where: {
            description: { contains: 'Simulated' }
        }
    })
    console.log('Cleaned up simulated entries.')
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
