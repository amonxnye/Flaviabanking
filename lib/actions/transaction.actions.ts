"use server";

import { z } from 'zod';
import { adminDb, COLLECTIONS, serverTimestamp, toDocs } from "../firebase/admin";
import { getSessionUid } from "../session";
import { parseStringify } from "../utils";
import { createAuditLog } from "../audit";

const transferSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  senderBankId: z.string().min(1),
  receiverBankId: z.string().min(1),
});

interface AccountRow {
  userId: string;
  name: string;
  currency?: string;
  balance?: number;
}

/**
 * Move money between two of the signed-in user's own accounts. Balances and
 * the ledger entry are written in one Firestore transaction, so either both
 * accounts change or nothing does.
 */
export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    const uid = await getSessionUid();
    if (!uid) throw new Error('Please sign in.');

    const validated = transferSchema.parse(transaction);

    const amount = parseFloat(validated.amount);
    if (!(amount > 0)) throw new Error('Amount must be greater than zero');

    if (validated.senderBankId === validated.receiverBankId) {
      throw new Error('Choose two different accounts');
    }

    const db = adminDb();
    const senderRef = db.collection(COLLECTIONS.accounts).doc(validated.senderBankId);
    const receiverRef = db.collection(COLLECTIONS.accounts).doc(validated.receiverBankId);
    const txnRef = db.collection(COLLECTIONS.transactions).doc();

    const data = {
      channel: 'online',
      category: 'Transfer',
      name: validated.name,
      amount: validated.amount,
      senderId: uid,
      receiverId: uid,
      senderBankId: validated.senderBankId,
      receiverBankId: validated.receiverBankId,
    };

    await db.runTransaction(async (tx) => {
      const [senderSnap, receiverSnap] = await Promise.all([tx.get(senderRef), tx.get(receiverRef)]);
      const sender = senderSnap.data() as AccountRow | undefined;
      const receiver = receiverSnap.data() as AccountRow | undefined;

      if (!sender || sender.userId !== uid || !receiver || receiver.userId !== uid) {
        throw new Error('Account not found');
      }
      if ((sender.currency || 'USD') !== (receiver.currency || 'USD')) {
        throw new Error('Both accounts must use the same currency');
      }
      const senderBalance = Number(sender.balance) || 0;
      if (senderBalance < amount) {
        throw new Error(`Insufficient funds in ${sender.name}`);
      }

      tx.update(senderRef, { balance: Math.round((senderBalance - amount) * 100) / 100 });
      tx.update(receiverRef, { balance: Math.round(((Number(receiver.balance) || 0) + amount) * 100) / 100 });
      tx.set(txnRef, { ...data, createdAt: serverTimestamp() });
    });

    await createAuditLog({
      userId: uid,
      action: 'transfer.create',
      resourceType: 'transaction',
      resourceId: txnRef.id,
      metadata: { amount: validated.amount, from: validated.senderBankId, to: validated.receiverBankId },
    });

    return parseStringify({ $id: txnRef.id, $createdAt: new Date().toISOString(), ...data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

export const getTransactionsByAccountId = async ({ accountId }: getTransactionsByAccountIdProps) => {
  try {
    const col = adminDb().collection(COLLECTIONS.transactions);

    const [sent, received] = await Promise.all([
      col.where('senderBankId', '==', accountId).get(),
      col.where('receiverBankId', '==', accountId).get(),
    ]);

    const documents = [...toDocs(sent), ...toDocs(received)];

    return parseStringify({ total: documents.length, documents });
  } catch (error) {
    console.log(error);
  }
}
