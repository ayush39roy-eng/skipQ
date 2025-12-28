import { prisma } from '../prisma';

export async function trainForecasting(vendorId: string) {
    // 1. Fetch sales for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orderItems = await prisma.orderItem.findMany({
        where: {
            order: {
                vendorId: vendorId,
                createdAt: { gte: thirtyDaysAgo }
            }
        },
        include: {
            order: {
                select: { createdAt: true }
            }
        }
    });

    // 2. Aggregate Daily Sales per Item
    const salesHistory: Record<string, Record<string, number>> = {}; // { itemId: { "YYYY-MM-DD": quantity } }

    orderItems.forEach((item) => {
        const dateKey = item.order.createdAt.toISOString().split('T')[0];
        if (!salesHistory[item.menuItemId]) {
            salesHistory[item.menuItemId] = {};
        }
        salesHistory[item.menuItemId][dateKey] = (salesHistory[item.menuItemId][dateKey] || 0) + item.quantity;
    });

    // 3. Simple Moving Average Forecast (Next Day)
    const forecasts: Record<string, number> = {};

    Object.entries(salesHistory).forEach(([itemId, dailySales]) => {
        // Ensure chronological order by sorting keys (dates)
        const quantities = Object.entries(dailySales)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([_, qty]) => qty);
            
        if (quantities.length === 0) return;

        // Last 7 days average (or fewer if not enough data)
        const recentQuantities = quantities.slice(-7);
        const sum = recentQuantities.reduce((a, b) => a + b, 0);
        const avg = sum / recentQuantities.length;

        // Add 10% safety buffer and round up
        forecasts[itemId] = Math.ceil(avg * 1.1);
    });

    return forecasts;
}
