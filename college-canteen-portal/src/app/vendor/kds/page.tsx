import KdsBoard from './KdsBoard'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'

import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function KDSPage() {
  const session = await getSession()
  if (!session || session.role !== 'VENDOR' || !session.user.vendorId) {
    redirect('/auth/login?callbackUrl=/vendor/kds')
  }

  const activeOrders = await prisma.order.findMany({
    where: {
      vendorId: session.user.vendorId,
      status: {
        in: ['ACCEPTED', 'PENDING', 'PREPARING', 'PAID', 'READY']
      }
    },
    select: {
      id: true,
      fulfillmentType: true,
      status: true,
      createdAt: true,
      cookingInstructions: true,
      items: {
        select: {
          quantity: true,
          menuItem: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  return <KdsBoard initialOrders={activeOrders} />
}
