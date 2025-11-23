import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'VENDOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { canteenId, openingTime, closingTime, weeklySchedule, autoMode, manualIsOpen } = body

    if (!canteenId) {
        return NextResponse.json({ error: 'Canteen ID is required' }, { status: 400 })
    }

    // Verify ownership
    const canteen = await prisma.canteen.findFirst({
        where: {
            id: canteenId,
            vendorId: session.user.vendorId ?? undefined
        }
    })

    if (!canteen) {
        return NextResponse.json({ error: 'Canteen not found or access denied' }, { status: 404 })
    }

    try {
        const updatedCanteen = await prisma.canteen.update({
            where: { id: canteenId },
            data: {
                ...(openingTime !== undefined && { openingTime }),
                ...(closingTime !== undefined && { closingTime }),
                ...(weeklySchedule !== undefined && { weeklySchedule }),
                ...(autoMode !== undefined && { autoMode }),
                ...(manualIsOpen !== undefined && { manualIsOpen })
            }
        })

        return NextResponse.json({ canteen: updatedCanteen })
    } catch (error) {
        console.error('Failed to update canteen settings:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
