
import { prisma } from '../src/lib/prisma';
import { acquireTrainingLock, releaseTrainingLock } from '../src/lib/jobs';
import { logAudit } from '../src/lib/audit';

async function verify() {
    console.log('--- VERIFYING AI SECURITY MODULES ---');

    try {
        // 1. Test Audit Logging
        console.log('1. Testing Audit Log...');
        await logAudit({
            action: 'VERIFY_SCRIPT',
            result: 'ALLOWED',
            method: 'SCRIPT',
            authType: 'API_KEY',
            authId: 'test_script',
            metadata: { note: 'This is a test' }
        });
        const auditCount = await prisma.auditLog.count();
        console.log(`   - Verified! Total Audit Logs: ${auditCount}`);

        // 2. Test Locking
        console.log('2. Testing Job Lock...');
        const lock1 = await acquireTrainingLock('verification_script');
        if (!lock1.success) throw new Error(`Failed to acquire initial lock: ${lock1.reason}`);
        console.log(`   - Acquired Lock ID: ${lock1.jobId}`);

        // 3. Test Concurrency (Should fail)
        console.log('3. Testing Concurrency Rejection...');
        const lock2 = await acquireTrainingLock('verification_script_2');
        if (lock2.success) throw new Error('Concurrency check failed! Should have rejected.');
        console.log(`   - Verified! Second lock rejected with: ${lock2.reason}`);

        // 4. Release
        console.log('4. Releasing Lock...');
        await releaseTrainingLock(lock1.jobId, true);
        console.log('   - Lock Released.');

        console.log('--- SUCCESS: ALL CHECKS PASSED ---');
    } catch (error) {
        console.error('--- FAILED ---');
        console.error(error);
        process.exit(1);
    }
}

verify()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
