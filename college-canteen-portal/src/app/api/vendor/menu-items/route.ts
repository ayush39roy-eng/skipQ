import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'

export async function POST(req: Request) {
    const session = await requireRole(['VENDOR'])
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { menuItemId, available } = body

        if (!menuItemId || typeof available !== 'boolean') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }

        // Verify ownership
        const item = await prisma.menuItem.findUnique({
            where: { id: menuItemId },
            include: { canteen: true }
        })

        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        if (item.canteen.vendorId !== session.user.vendorId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        await prisma.menuItem.update({
            where: { id: menuItemId },
            data: { available }
        })

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Failed to update menu item availability:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
