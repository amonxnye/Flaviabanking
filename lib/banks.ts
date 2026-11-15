import "server-only";

// Bank documents hold the Plaid access token and the Dwolla funding source.
// These helpers are server-only (not server actions), so the browser can never
// call them or receive those fields. Callers must check ownership.

import { adminDb, COLLECTIONS, serverTimestamp, toDoc, toDocs } from "./firebase/admin";

export const getBanks = async ({ userId }: getBanksProps): Promise<Bank[]> => {
  const snap = await adminDb()
    .collection(COLLECTIONS.banks)
    .where('userId', '==', userId)
    .get();

  return toDocs(snap) as unknown as Bank[];
}

export const getBank = async (documentId: string): Promise<Bank | null> => {
  if (!documentId) return null;
  const snap = await adminDb().collection(COLLECTIONS.banks).doc(documentId).get();
  return toDoc(snap) as unknown as Bank | null;
}

export const getBankByAccountId = async (accountId: string): Promise<Bank | null> => {
  const snap = await adminDb()
    .collection(COLLECTIONS.banks)
    .where('accountId', '==', accountId)
    .limit(2)
    .get();

  if (snap.size !== 1) return null;

  return toDoc(snap.docs[0]) as unknown as Bank;
}

/** Throws on failure, so the caller can undo the Dwolla funding source. */
export const createBankAccount = async (data: createBankAccountProps) => {
  const ref = await adminDb().collection(COLLECTIONS.banks).add({
    ...data,
    createdAt: serverTimestamp(),
  });

  return { $id: ref.id, ...data };
}
