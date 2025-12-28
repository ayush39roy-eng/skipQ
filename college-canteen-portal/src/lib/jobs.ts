import { prisma } from './prisma';
import { addSeconds } from 'date-fns';

const COOLDOWN_SECONDS = parseInt(process.env.TRAIN_COOLDOWN_SECONDS || '60', 10);
const LOCK_ID = 'TRAINING_LOCK';

export type JobLockResult = 
  | { success: true; jobId: string }
  | { success: false; reason: 'CONFLICT' | 'RATE_LIMITED' };

export async function acquireTrainingLock(trigger: string): Promise<JobLockResult> {
    // 1. Ensure Lock Exists (Atomic Upsert)
    // We try to ensure the lock row exists. It doesn't matter if it's currently locked or not here.
    try {
        await prisma.jobLock.upsert({
            where: { id: LOCK_ID },
            create: { id: LOCK_ID, isLocked: false },
            update: {} 
        });
    } catch (e) {
        // Ignore upsert race condition
    }

    // 2. Rate Limit Logic (Still relying on job history, but we check this *before* taking the hard lock to fail fast)
    // Note: To be perfectly race-proof for rate limiting, we'd need to lock first, but failing fast is better UX.
    const lastJob = await prisma.trainingJob.findFirst({
        orderBy: { startedAt: 'desc' }
    });

    if (lastJob) {
        const cooldownUntil = addSeconds(lastJob.startedAt, COOLDOWN_SECONDS);
        if (new Date() < cooldownUntil) {
            return { success: false, reason: 'RATE_LIMITED' };
        }
    }

    // 3. ATOMIC ACQUIRE
    // We try to set isLocked=true WHERE isLocked=false
    try {
        // Prisma doesn't support "update where" for non-unique fields directly in the top-level where,
        // but we can simulate atomic check-and-set using database unique constraints or transactions.
        // For MongoDB, we can use findOneAndUpdate equivalent via raw or optimistic concurrency.
        // However, standard Prisma flow for "CAS" (Compare And Swap) is tricky.
        
        // Simpler approach for Prisma + Mongo: Use a transaction with a check.
        // Since we are in a transaction, the read status should be consistent.
        
        return await prisma.$transaction(async (tx) => {
            const currentLock = await tx.jobLock.findUnique({ where: { id: LOCK_ID } });
            
            if (currentLock?.isLocked) {
                // Check if stale? (Optional: e.g. locked > 15 mins ago). 
                // For now, strict conflict.
                return { success: false, reason: 'CONFLICT' };
            }

            // Lock it
            await tx.jobLock.update({
                where: { id: LOCK_ID },
                data: { isLocked: true, lockedBy: trigger }
            });

            // Create the job record
            const newJob = await tx.trainingJob.create({
                data: {
                    trigger,
                    status: 'RUNNING'
                }
            });

            return { success: true, jobId: newJob.id };
        });

    } catch (error) {
        // Transaction failed (likely write conflict if high concurrency)
        console.error('Lock Acquire Failed:', error);
        return { success: false, reason: 'CONFLICT' };
    }
}

export async function releaseTrainingLock(jobId: string, success: boolean, error?: any) {
    try {
        await prisma.$transaction([
            // 1. Release the global lock
            prisma.jobLock.update({
                where: { id: LOCK_ID },
                data: { isLocked: false, lockedBy: null }
            }),
            // 2. Update the job status
            prisma.trainingJob.update({
                where: { id: jobId },
                data: {
                    status: success ? 'COMPLETED' : 'FAILED',
                    completedAt: new Date(),
                    error: error ? String(error) : undefined
                }
            })
        ]);
    } catch (e) {
        console.error('Failed to release lock:', e);
        // Important: If this fails, the system might be stuck locked. 
        // In a real prod system, we'd have a timeout/cron to clear stale locks.
    }
}
