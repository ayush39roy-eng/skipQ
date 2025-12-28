import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    // 1. Validation
    if (!vendorId) {
        return NextResponse.json({ error: 'Vendor ID required' }, { status: 400 });
    }
    
    // Basic ObjectId validation (24 hex chars)
    if (!/^[0-9a-fA-F]{24}$/.test(vendorId)) {
        return NextResponse.json({ error: 'Invalid Vendor ID format' }, { status: 400 });
    }

    // 2. Authentication
    const session = await getSession();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Authorization (Role or Ownership)
    const isAuthorized = session.role === 'ADMIN' || session.user.vendorId === vendorId;
    
    if (!isAuthorized) {
        // If user is a VENDOR but trying to access another vendor's data or just a USER
        if (session.role === 'VENDOR' && session.user.vendorId !== vendorId) {
             return NextResponse.json({ error: 'Forbidden: Access denied to this vendor' }, { status: 403 });
        }
        // If regular user trying to access vendor insights
        if (session.role === 'USER') {
             return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }
        // Fallback catch-all
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const [matrix, churn] = await Promise.all([
            prisma.aiInsights.findFirst({
                where: { vendorId: vendorId, type: 'MENU_MATRIX' },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.aiInsights.findFirst({
                where: { vendorId: vendorId, type: 'CHURN_LIST' },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        let parsedMatrix = {};
        let parsedChurn = [];



        // Parse Matrix independent of Churn
        try {
             if (matrix?.data) {
                 if (typeof matrix.data === 'string') {
                    parsedMatrix = JSON.parse(matrix.data);
                 } else {
                    parsedMatrix = matrix.data;
                 }
             }
        } catch (e) {
            console.error('Insights Matrix Parse Error:', e, 'Raw:', matrix?.data);
            parsedMatrix = {}; // Fallback
        }

        // Parse Churn independent of Matrix
        try {
             if (churn?.data) {
                 if (typeof churn.data === 'string') {
                    parsedChurn = JSON.parse(churn.data);
                 } else {
                    parsedChurn = churn.data as unknown[];
                 }
             }
        } catch (e) {
            console.error('Insights Churn Parse Error:', e, 'Raw:', churn?.data);
            parsedChurn = []; // Fallback
        }

        return NextResponse.json({
            matrix: parsedMatrix,
            churnList: parsedChurn
        });
    } catch (error) {
        console.error('Insights fetch failed:', error instanceof Error ? error.stack : error);
        return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
    }
}
