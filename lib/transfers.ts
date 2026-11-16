import "server-only";

import { adminDb, COLLECTIONS } from "./firebase/admin";
import { createAuditLog } from "./audit";
import { getDwollaTransferStatus } from "./actions/dwolla.actions";
import { canChangeTransferStatus, toTransferStatus, type TransferStatus } from "./transfer-status";

// Pending transfers older than this are re-checked with Dwolla on page load,
// so a missed webhook cannot leave them pending forever.
const RECHECK_AFTER_MS = 60_000;
const MAX_RECHECKS_PER_LOAD = 5;

interface TransferDoc {
  $id: string;
  $createdAt: string;
  senderId?: string;
  status?: string;
  dwollaTransferUrl?: string;
}

/**
 * Apply a new Dwolla status to one transfer, if the state machine allows it.
 * Returns the status the transfer has afterwards.
 */
export async function applyTransferStatus(
  doc: TransferDoc,
  rawStatus: string
): Promise<string | undefined> {
  const to = toTransferStatus(rawStatus);
  const from = toTransferStatus(doc.status);
  if (!to || !canChangeTransferStatus(from, to)) return doc.status;

  await adminDb().collection(COLLECTIONS.transactions).doc(doc.$id).update({ status: to });

  if (doc.senderId && (to === "processed" || to === "failed" || to === "cancelled")) {
    await createAuditLog({
      userId: doc.senderId,
      action: to === "processed" ? "transfer.complete" : "transfer.fail",
      resourceType: "transaction",
      resourceId: doc.$id,
      metadata: { status: to },
    });
  }
  return to;
}

/** Webhook path: look up the transfer by its Dwolla URL and sync it. */
export async function syncTransferByUrl(transferUrl: string): Promise<TransferStatus | null> {
  const snap = await adminDb()
    .collection(COLLECTIONS.transactions)
    .where("dwollaTransferUrl", "==", transferUrl)
    .limit(1)
    .get();
  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  const doc: TransferDoc = { ...(docSnap.data() as Omit<TransferDoc, "$id">), $id: docSnap.id };
  const status = await getDwollaTransferStatus(transferUrl);
  return toTransferStatus(await applyTransferStatus(doc, status));
}

/** Page-load path: re-check a few stale pending transfers, return updated docs. */
export async function refreshPendingTransfers<T extends TransferDoc>(docs: T[]): Promise<T[]> {
  const now = Date.now();
  const stale = docs
    .filter(
      (d) =>
        d.status === "pending" &&
        d.dwollaTransferUrl &&
        now - new Date(d.$createdAt).getTime() > RECHECK_AFTER_MS
    )
    .slice(0, MAX_RECHECKS_PER_LOAD);

  const updated = new Map<string, string | undefined>();
  await Promise.all(
    stale.map(async (d) => {
      try {
        const status = await getDwollaTransferStatus(d.dwollaTransferUrl!);
        updated.set(d.$id, await applyTransferStatus(d, status));
      } catch (error) {
        console.error("Failed to refresh transfer status:", error);
      }
    })
  );

  return docs.map((d) => (updated.has(d.$id) ? { ...d, status: updated.get(d.$id) } : d));
}
