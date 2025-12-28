import { prisma } from '../prisma';
import { Order, OrderItem } from '@prisma/client';

export async function trainMenuMatrix(vendorId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. Fetch orders
    const orders = await prisma.order.findMany({
        where: {
            vendorId: vendorId,
            status: 'COMPLETED',
            createdAt: { gte: startDate }
        },
        include: {
            items: true
        }
    });

    const itemStats: Record<string, { volume: number, revenue: number }> = {};
    let totalVolume = 0;
    let totalRevenue = 0;

    // 2. Calculate Item Performance
    orders.forEach((order: Order & { items: OrderItem[] }) => {
        order.items.forEach((item: OrderItem) => {
            if (!itemStats[item.menuItemId]) {
                itemStats[item.menuItemId] = { volume: 0, revenue: 0 };
            }
            itemStats[item.menuItemId].volume += item.quantity;
            itemStats[item.menuItemId].revenue += item.priceCents * item.quantity;

            totalVolume += item.quantity;
            totalRevenue += item.priceCents * item.quantity;
        });
    });

    const itemCount = Object.keys(itemStats).length;
    if (itemCount === 0) return {};

    const avgVolume = totalVolume / itemCount;
    const avgRevenue = totalRevenue / itemCount;

    // 3. Classify Items
    const matrix: Record<string, string> = {}; // "STAR" | "PLOWHORSE" | "PUZZLE" | "DOG"

    Object.entries(itemStats).forEach(([itemId, stats]) => {
        const isHighVolume = stats.volume >= avgVolume;
        const isHighRevenue = stats.revenue >= avgRevenue;

        if (isHighVolume && isHighRevenue) matrix[itemId] = "STAR";
        else if (isHighVolume && !isHighRevenue) matrix[itemId] = "PLOWHORSE"; // Workhorse
        else if (!isHighVolume && isHighRevenue) matrix[itemId] = "PUZZLE";
        else matrix[itemId] = "DOG";
    });

    return matrix;
}
