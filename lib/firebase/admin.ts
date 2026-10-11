import "server-only";

import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK (server only).
 *
 * Credentials:
 *  - On Firebase App Hosting / Cloud Run nothing is needed: Application Default
 *    Credentials come from the backend's service account.
 *  - Locally, set FIREBASE_SERVICE_ACCOUNT to the service-account JSON
 *    (raw or base64) from Project settings → Service accounts.
 */
function getCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return applicationDefault();
  const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return cert(JSON.parse(json));
}

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];
  return initializeApp({
    credential: getCredential(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());

export const COLLECTIONS = {
  users: "users",
  accounts: "accounts",
  transactions: "transactions",
  auditLogs: "auditLogs",
  walletTransactions: "walletTransactions",
} as const;

export const serverTimestamp = () => FieldValue.serverTimestamp();

/**
 * Convert a Firestore snapshot into the plain document shape the UI already
 * uses ($id / $createdAt, ISO strings instead of Timestamps).
 */
export function toDoc<T = Record<string, unknown>>(
  snap: FirebaseFirestore.DocumentSnapshot
): (T & { $id: string; $createdAt: string }) | null {
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const out: Record<string, unknown> = { $id: snap.id };
  for (const [key, value] of Object.entries(data)) {
    out[key] = value instanceof Timestamp ? value.toDate().toISOString() : value;
  }
  out.$createdAt =
    (out.createdAt as string | undefined) ||
    snap.createTime?.toDate().toISOString() ||
    new Date().toISOString();
  return out as T & { $id: string; $createdAt: string };
}

export function toDocs<T = Record<string, unknown>>(
  query: FirebaseFirestore.QuerySnapshot
): Array<T & { $id: string; $createdAt: string }> {
  return query.docs
    .map((d) => toDoc<T>(d))
    .filter((d): d is T & { $id: string; $createdAt: string } => d !== null);
}
