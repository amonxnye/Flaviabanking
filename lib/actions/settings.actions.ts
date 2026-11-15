'use server';

import { z } from "zod";
import { adminAuth, adminDb, COLLECTIONS, toDoc, toDocs } from "../firebase/admin";
import { clearSessionCookie, getSessionUid } from "../session";
import { parseStringify } from "../utils";
import { plaidClient } from "../plaid";
import { deactivateDwollaCustomer } from "./dwolla.actions";

// Firestore allows 500 writes per batch; stay under it.
const DELETE_BATCH_SIZE = 400;

const profileUpdateSchema = z.object({
  firstName: z.string().min(2).max(50).regex(/^[a-zA-Z\s'-]+$/),
  lastName: z.string().min(2).max(50).regex(/^[a-zA-Z\s'-]+$/),
  address1: z.string().min(5).max(100),
  city: z.string().min(2).max(50),
  state: z.string().length(2).regex(/^[A-Z]{2}$/),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/),
});

async function requireSelf(userId: string) {
  const uid = await getSessionUid();
  if (!uid || uid !== userId) {
    throw new Error('Unauthorized');
  }
  return uid;
}

async function listUserBanks(userId: string) {
  const snap = await adminDb().collection(COLLECTIONS.banks).where('userId', '==', userId).get();
  return toDocs<{ userId: string; accessToken?: string }>(snap);
}

async function listBankTransactions(bankId: string) {
  const col = adminDb().collection(COLLECTIONS.transactions);
  const [sent, received] = await Promise.all([
    col.where('senderBankId', '==', bankId).get(),
    col.where('receiverBankId', '==', bankId).get(),
  ]);
  return { sent: toDocs(sent), received: toDocs(received) };
}

export const updateUserProfile = async (
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    address1: string;
    city: string;
    state: string;
    postalCode: string;
  }
) => {
  try {
    const validated = profileUpdateSchema.parse(data);
    await requireSelf(userId);

    const ref = adminDb().collection(COLLECTIONS.users).doc(userId);
    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error('User not found');
    }

    await ref.update({
      ...validated,
      name: `${validated.firstName} ${validated.lastName}`,
    });

    return parseStringify(toDoc(await ref.get()));
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const exportUserData = async (userId: string) => {
  try {
    await requireSelf(userId);

    const profileDoc = toDoc<Record<string, string>>(
      await adminDb().collection(COLLECTIONS.users).doc(userId).get()
    );
    const banks = await listUserBanks(userId);

    const allTransactions: any[] = [];
    for (const bank of banks) {
      const { sent, received } = await listBankTransactions(bank.$id);
      allTransactions.push(...sent, ...received);
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      profile: profileDoc ? {
        firstName: profileDoc.firstName,
        lastName: profileDoc.lastName,
        email: profileDoc.email,
        address1: profileDoc.address1,
        city: profileDoc.city,
        state: profileDoc.state,
        postalCode: profileDoc.postalCode,
      } : null,
      connectedBanks: banks.length,
      transactions: allTransactions.map(t => ({
        name: t.name,
        amount: t.amount,
        category: t.category,
        channel: t.channel,
        email: t.email,
        date: t.$createdAt,
      })),
    };

    return parseStringify(exportData);
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
};

/**
 * Delete the signed-in user's account.
 *
 * Deleted: profile, linked banks (and their Plaid items), transfers the user
 * sent, wallet history, and the login. The Dwolla customer is deactivated.
 * Kept: transfers other customers sent to this user (they are also the
 * sender's records) and security audit logs.
 *
 * Order: outside services first (best effort), then Firestore in batches, then
 * the login last. If a step fails the user can still sign in and retry; a
 * login left without a profile can finish sign-up again.
 */
export const deleteUserAccount = async (userId: string) => {
  try {
    await requireSelf(userId);

    const db = adminDb();
    const userRef = db.collection(COLLECTIONS.users).doc(userId);
    const profile = toDoc<{ dwollaCustomerUrl?: string }>(await userRef.get());
    const banks = await listUserBanks(userId);

    // 1. Outside services. Failures are logged and do not block deletion.
    await Promise.all(
      banks.map((bank) =>
        bank.accessToken
          ? plaidClient.itemRemove({ access_token: bank.accessToken }).catch((e) =>
              console.error('Failed to remove Plaid item:', e)
            )
          : undefined
      )
    );
    if (profile?.dwollaCustomerUrl) await deactivateDwollaCustomer(profile.dwollaCustomerUrl);

    // 2. Firestore documents.
    const refs: FirebaseFirestore.DocumentReference[] = [];
    for (const bank of banks) {
      const { sent } = await listBankTransactions(bank.$id);
      refs.push(...sent.map((txn) => db.collection(COLLECTIONS.transactions).doc(txn.$id)));
      refs.push(db.collection(COLLECTIONS.banks).doc(bank.$id));
    }
    const wallet = await db.collection(COLLECTIONS.walletTransactions).where('userId', '==', userId).get();
    refs.push(...wallet.docs.map((d) => d.ref));
    refs.push(userRef); // profile last, so a partial failure can be retried

    for (let i = 0; i < refs.length; i += DELETE_BATCH_SIZE) {
      const batch = db.batch();
      refs.slice(i, i + DELETE_BATCH_SIZE).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    // 3. The login.
    await adminAuth().deleteUser(userId);

    clearSessionCookie();

    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

export const unlinkBankAccount = async (userId: string, bankDocumentId: string) => {
  try {
    await requireSelf(userId);

    const ref = adminDb().collection(COLLECTIONS.banks).doc(bankDocumentId);
    const bankDoc = toDoc<{ userId?: string }>(await ref.get());
    if (!bankDoc || bankDoc.userId !== userId) {
      throw new Error('Bank account not found or unauthorized');
    }

    await ref.delete();

    return { success: true };
  } catch (error) {
    console.error('Error unlinking bank account:', error);
    throw error;
  }
};
