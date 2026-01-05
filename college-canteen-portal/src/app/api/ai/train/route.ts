import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAudit, AccessResult, AuthType } from '@/lib/audit';
import { acquireTrainingLock, releaseTrainingLock } from '@/lib/jobs';

// AI Training Functions
import { trainAssociationRules } from '@/lib/ai/association-rules';
import { trainForecasting } from '@/lib/ai/forecasting';
import { trainMenuMatrix } from '@/lib/ai/menu-engineering';
import { trainChurnAnalytics } from '@/lib/ai/churn-analytics';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: Request) {
    // Context for Audit
    const ip = (await headers()).get('x-forwarded-for') || 'unknown';
    const method = 'POST';
    let authType: AuthType = 'ANONYMOUS';
    let authId = 'unknown';

    try {
        // --- 1. AUTHENTICATION (Fail-Closed) ---
        let isAuthenticated = false;
        
        // A. Primary: API Key
        const authHeader = (await headers()).get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const adminKeys = (process.env.ADMIN_API_KEYS || '').split(',');
            
            for (const keyEntry of adminKeys) {
                const [key, id] = keyEntry.split(':');
                if (key && key === token) {
                    isAuthenticated = true;
                    authType = 'API_KEY';
                    authId = id || 'unknown_key_id';
                    break;
                }
            }
        }

        // B. Secondary: Admin Session
        if (!isAuthenticated) {
            const session = await getSession();
            if (session && session.role === 'ADMIN') {
                isAuthenticated = true;
                authType = 'SESSION';
                authId = session.user.id; // Assuming session.user exists and has ID
            }
        }

        if (!isAuthenticated) {
            await logAudit({ action: 'TRIGGER_TRAINING', result: 'DENIED', severity: 'SECURITY', ip, method, authType, authId });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // --- 2. CONCURRENCY & RATE LIMITING ---
        const lock = await acquireTrainingLock(authType === 'API_KEY' ? `API:${authId}` : `USER:${authId}`);

        if (!lock.success) {
            const result: AccessResult = lock.reason === 'CONFLICT' ? 'CONFLICT' : 'RATE_LIMITED';
            const status = lock.reason === 'CONFLICT' ? 409 : 429;
            const msg = lock.reason === 'CONFLICT' ? 'Training already in progress' : 'Rate limit exceeded (60s cooldown)';
            
            await logAudit({ action: 'TRIGGER_TRAINING', result, severity: 'WARN', ip, method, authType, authId });
            return NextResponse.json({ error: msg }, { status });
        }

        // --- 3. EXECUTION ---
        await logAudit({ action: 'TRIGGER_TRAINING', result: 'ALLOWED', severity: 'INFO', ip, method, authType, authId, metadata: { jobId: lock.jobId } });

        // We run this *synchronously* for now as Next.js serverless limits bg tasks, 
        // but in a real worker setup this would push to a queue.
        // For the sake of the requirement "Trigger a background job", we can wrap in a specific catch block 
        // to ensure we release the lock.
        
        try {
            console.log(`[Job ${lock.jobId}] Starting AI Training Flow...`);
            
            // Helper for atomic update & retention
            const saveInsight = async (type: string, data: unknown, vendorId: string | null = null) => {
                const retentionDate = new Date();
                retentionDate.setDate(retentionDate.getDate() - 30); // 30-day retention

                await prisma.$transaction([
                    // 1. Mark existing latest as false
                    prisma.aiInsights.updateMany({
                        where: { type, vendorId, isLatest: true },
                        data: { isLatest: false }
                    }),
                    // 2. Insert new latest
                    prisma.aiInsights.create({
                        data: {
                            type,
                            vendorId,
                            isLatest: true,
                            data: typeof data === 'string' ? data : JSON.stringify(data)
                        }
                    }),
                    // 3. Cleanup old records
                    prisma.aiInsights.deleteMany({
                        where: {
                            type,
                            vendorId,
                            createdAt: { lt: retentionDate }
                        }
                    })
                ]);
            };
            
            // 1. Global Rules
            const rules = await trainAssociationRules();
            await saveInsight('ASSOCIATION_RULES', rules);

            // 2. Vendor Specific
            const vendors = await prisma.vendor.findMany();
            for (const vendor of vendors) {
                const forecast = await trainForecasting(vendor.id);
                await saveInsight('DAILY_FORECAST', forecast, vendor.id);

                const matrix = await trainMenuMatrix(vendor.id);
                await saveInsight('MENU_MATRIX', matrix, vendor.id);

                const churnList = await trainChurnAnalytics(vendor.id);
                await saveInsight('CHURN_LIST', churnList, vendor.id);
            }

            console.log(`[Job ${lock.jobId}] Completed Successfully.`);
            await releaseTrainingLock(lock.jobId, true);
            
            return NextResponse.json({ success: true, jobId: lock.jobId, message: 'Training Completed' });

        } catch (execError) {
            console.error(`[Job ${lock.jobId}] Failed:`, execError);
            await releaseTrainingLock(lock.jobId, false, execError);
            return NextResponse.json({ success: false, error: 'Internal Training Error' }, { status: 500 });
        }

    } catch (error) {
        console.error('Fatal Error in /api/ai/train:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
