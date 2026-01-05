import { prisma } from './prisma';

export type AuthType = 'API_KEY' | 'SESSION' | 'ANONYMOUS' | 'SYSTEM';
export type AccessResult = 'ALLOWED' | 'DENIED' | 'RATE_LIMITED' | 'CONFLICT' | 'INTERNAL_ERROR' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
export type Severity = 'INFO' | 'WARN' | 'CRITICAL' | 'SECURITY';
export type EntityType = 'VENDOR' | 'ORDER' | 'SETTLEMENT' | 'SYSTEM' | 'USER' | 'MENU_ITEM' | 'PAYMENT' | 'REFUND';

interface AuditEntry {
    action: string;
    result: AccessResult;
    severity: Severity;
    
    // Context
    ip?: string;
    method: string;
    reqId?: string;
    
    // Who
    authType: AuthType;
    authId?: string;
    
    // target
    entityType?: EntityType;
    entityId?: string;
    
    // State Changes
    before?: any;
    after?: any;
    
    metadata?: Record<string, any>;
}

export async function logAudit(entry: AuditEntry) {
    try {
        await prisma.auditLog.create({
            data: {
                action: entry.action,
                result: entry.result,
                // @ts-ignore - severity added to schema but client not regenerated due to lock
                severity: entry.severity,
                
                ip: entry.ip,
                method: entry.method,
                reqId: entry.reqId,
                
                authType: entry.authType,
                authId: entry.authId,
                
                entityType: entry.entityType,
                entityId: entry.entityId,
                
                before: entry.before ? JSON.parse(JSON.stringify(entry.before)) : undefined,
                after: entry.after ? JSON.parse(JSON.stringify(entry.after)) : undefined,
                
                metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined,
            },
        });
        
        // Console Fallback
        const prefix = `[AUDIT:${entry.severity}]`;
        if (entry.severity === 'CRITICAL' || entry.severity === 'SECURITY') {
            console.warn(`${prefix} ${entry.action} (${entry.result}) by ${entry.authId || 'ANT'}`);
        } else {
            console.log(`${prefix} ${entry.action} (${entry.result})`);
        }
    } catch (error) {
        console.error('[AUDIT_FAILURE] Failed to write audit log:', error);
    }
}
