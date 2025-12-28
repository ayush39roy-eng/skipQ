import { prisma } from './prisma';

export type AuthType = 'API_KEY' | 'SESSION' | 'ANONYMOUS';
export type AccessResult = 'ALLOWED' | 'DENIED' | 'RATE_LIMITED' | 'CONFLICT' | 'INTERNAL_ERROR';

interface AuditEntry {
    action: string;
    result: AccessResult;
    ip?: string;
    method: string;
    authType: AuthType;
    authId?: string;
    metadata?: Record<string, any>;
}

export async function logAudit(entry: AuditEntry) {
    try {
        await prisma.auditLog.create({
            data: {
                action: entry.action,
                result: entry.result,
                ip: entry.ip,
                method: entry.method,
                authType: entry.authType,
                authId: entry.authId,
                metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
            },
        });
        
        // Also log to console for immediate visibility in standard logs
        if (entry.result !== 'ALLOWED') {
            console.warn(`[AUDIT] ${entry.result} - ${entry.action} by ${entry.authType}:${entry.authId || 'anonymous'}`);
        } else {
            console.log(`[AUDIT] ${entry.result} - ${entry.action} by ${entry.authType}:${entry.authId}`);
        }
    } catch (error) {
        // Fallback if DB logging fails - critical to not crash the request but still log
        console.error('[AUDIT_FAILURE] Failed to write audit log:', error, entry);
    }
}
