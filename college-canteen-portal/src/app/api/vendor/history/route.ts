
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendorId = session.user.vendorId
    if (!vendorId) {
        return NextResponse.json({ error: 'No vendor linked' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        const orders = await prisma.order.findMany({
            where: {
                vendorId: vendorId,
                status: {
                    in: ['COMPLETED', 'READY', 'CONFIRMED', 'CANCELLED'] 
                }
            },
            take: limit,
            skip: offset,
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                createdAt: true,
                status: true,
                vendorTakeCents: true, // Specifically selecting THIS for value
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        priceCents: true, // Unit price
                        menuItem: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        })

        // Transform for client
        const history = orders.map(order => ({
            id: order.id,
            date: order.createdAt,
            status: order.status,
            totalValue: order.vendorTakeCents, // Expose ONLY usage value
            items: order.items.map(item => ({
                name: item.menuItem.name,
                quantity: item.quantity,
                unitPrice: item.priceCents
            }))
        }))

        return NextResponse.json({ orders: history })

    } catch (error) {
        console.error('History fetch error:', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
