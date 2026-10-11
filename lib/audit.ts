'use server';

import { adminDb, COLLECTIONS, serverTimestamp, toDocs } from "./firebase/admin";
import { parseStringify } from "./utils";

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.signup'
  | 'user.profile_update'
  | 'user.password_reset'
  | 'user.account_delete'
  | 'bank.connect'
  | 'bank.unlink'
  | 'transfer.create'
  | 'transfer.complete'
  | 'transfer.fail'
  | 'wallet.collection.initiated'
  | 'assistant.action_confirm'
  | 'assistant.action_cancel'
  | 'data.export'
  | 'settings.update'
  | 'plan.upgrade'
  | 'plan.downgrade'
  | 'org.create'
  | 'org.member_add'
  | 'org.member_remove'
  | 'org.role_change';

export interface AuditEntry {
  userId: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, string>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await adminDb().collection(COLLECTIONS.auditLogs).add({
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType || '',
      resourceId: entry.resourceId || '',
      metadata: JSON.stringify(entry.metadata || {}),
      ipAddress: entry.ipAddress || '',
      userAgent: entry.userAgent || '',
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function getAuditLogs(userId: string, limit: number = 50) {
  try {
    const snap = await adminDb()
      .collection(COLLECTIONS.auditLogs)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const documents = toDocs(snap);
    return parseStringify({ documents, total: documents.length });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return { documents: [], total: 0 };
  }
}
