'use server';

import { ID } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { parseStringify } from "./utils";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
} = process.env;

const AUDIT_COLLECTION_ID = process.env.APPWRITE_AUDIT_COLLECTION_ID;

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
  if (!AUDIT_COLLECTION_ID || !DATABASE_ID) {
    console.warn('Audit logging not configured (APPWRITE_AUDIT_COLLECTION_ID missing). Entry:', entry.action);
    return;
  }

  try {
    const { database } = await createAdminClient();

    await database.createDocument(
      DATABASE_ID,
      AUDIT_COLLECTION_ID,
      ID.unique(),
      {
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType || '',
        resourceId: entry.resourceId || '',
        metadata: JSON.stringify(entry.metadata || {}),
        ipAddress: entry.ipAddress || '',
        userAgent: entry.userAgent || '',
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function getAuditLogs(userId: string, limit: number = 50) {
  if (!AUDIT_COLLECTION_ID || !DATABASE_ID) {
    return { documents: [], total: 0 };
  }

  try {
    const { Query } = await import("node-appwrite");
    const { database } = await createAdminClient();

    const logs = await database.listDocuments(
      DATABASE_ID,
      AUDIT_COLLECTION_ID,
      [
        Query.equal('userId', [userId]),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
      ]
    );

    return parseStringify(logs);
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return { documents: [], total: 0 };
  }
}
