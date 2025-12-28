import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    if (!vendorId) {
        return NextResponse.json({ error: 'Vendor ID required' }, { status: 400 });
    }

    try {
        const forecast = await prisma.aiInsights.findFirst({
            where: {
                vendorId: vendorId,
                type: 'DAILY_FORECAST'
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!forecast) {
            return NextResponse.json({ data: {} });
        }

        let parsedData;
        try {
            if (typeof forecast.data === 'string') {
                parsedData = JSON.parse(forecast.data);
            } else {
                parsedData = forecast.data;
            }
        } catch (parseError) {
            console.error('JSON Parse Error for Vendor:', vendorId, parseError);
            return NextResponse.json({ error: 'Failed to parse forecast data' }, { status: 500 });
        }

        return NextResponse.json({ data: parsedData });
    } catch (error) {
        console.error('Forecast fetch failed:', error);
        return NextResponse.json({ error: 'Failed to fetch forecast' }, { status: 500 });
    }
}
