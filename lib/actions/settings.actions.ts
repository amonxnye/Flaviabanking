'use server';

import { z } from "zod";
import { adminAuth, adminDb, COLLECTIONS, toDoc, toDocs } from "../firebase/admin";
import { clearSessionCookie, getSessionUid } from "../session";
import { parseStringify } from "../utils";

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

async function listUserAccounts(userId: string) {
  const snap = await adminDb().collection(COLLECTIONS.accounts).where('userId', '==', userId).get();
  return toDocs<{ userId: string }>(snap);
}

async function listAccountTransactions(accountId: string) {
  const col = adminDb().collection(COLLECTIONS.transactions);
  const [sent, received] = await Promise.all([
    col.where('senderBankId', '==', accountId).get(),
    col.where('receiverBankId', '==', accountId).get(),
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
    const banks = await listUserAccounts(userId);

    const allTransactions: any[] = [];
    for (const bank of banks) {
      const { sent, received } = await listAccountTransactions(bank.$id);
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
      accounts: banks.map(b => ({ name: (b as any).name, institution: (b as any).institution, currency: (b as any).currency, balance: (b as any).balance })),
      transactions: allTransactions.map(t => ({
        name: t.name,
        amount: t.amount,
        category: t.category,
        channel: t.channel,
        from: t.senderBankId,
        to: t.receiverBankId,
        date: t.$createdAt,
      })),
    };

    return parseStringify(exportData);
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
};

export const deleteUserAccount = async (userId: string) => {
  try {
    await requireSelf(userId);

    const db = adminDb();
    const banks = await listUserAccounts(userId);
    for (const bank of banks) {
      const { sent, received } = await listAccountTransactions(bank.$id);
      for (const txn of [...sent, ...received]) {
        await db.collection(COLLECTIONS.transactions).doc(txn.$id).delete();
      }
      await db.collection(COLLECTIONS.accounts).doc(bank.$id).delete();
    }

    await db.collection(COLLECTIONS.users).doc(userId).delete();
    await adminAuth().deleteUser(userId);

    clearSessionCookie();

    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};
