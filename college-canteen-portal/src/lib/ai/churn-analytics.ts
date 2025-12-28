import { prisma } from '../prisma';

export async function trainChurnAnalytics(vendorId?: string) {
    // 1. Fetch all users who ordered > 3 times in the last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where: any = {
        createdAt: { gte: sixtyDaysAgo }
    };

    if (vendorId !== undefined) {
        where.vendorId = vendorId;
    }

    const activeUsers = await prisma.order.groupBy({
        by: ['userId'],
        where,
        _count: {
            id: true
        },
        having: {
            id: {
                _count: { gt: 3 }
            }
        }
    });

    const atRiskUserIds: string[] = [];

    // 2. Check which of these did NOT order in the last 7 days (efficiently fetch last order date)
    const activeUserIds = activeUsers
        .map(u => u.userId)
        .filter((id): id is string => id !== null);

    if (activeUserIds.length === 0) {
        return [];
    }

    const lastOrderWhere: any = {
        userId: { in: activeUserIds }
    };

    if (vendorId !== undefined) {
        lastOrderWhere.vendorId = vendorId;
    }

    const lastOrderDates = await prisma.order.groupBy({
        by: ['userId'],
        where: lastOrderWhere,
        _max: {
            createdAt: true
        }
    });

    // 3. Identification: Users whose last order was > 7 days ago
    for (const userStat of lastOrderDates) {
        if (userStat.userId && userStat._max.createdAt && userStat._max.createdAt < sevenDaysAgo) {
            atRiskUserIds.push(userStat.userId);
        }
    }

    return atRiskUserIds;
}
