"use server";

import { z } from 'zod';
import { adminDb, COLLECTIONS, serverTimestamp, toDocs } from "../firebase/admin";
import { parseStringify } from "../utils";
import { createAuditLog } from "../audit";

const transferSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  senderId: z.string().min(1),
  senderBankId: z.string().min(1),
  receiverId: z.string().min(1),
  receiverBankId: z.string().min(1),
  email: z.string().email(),
});

const TRANSFER_MIN_AMOUNT = 1.00;
const TRANSFER_MAX_AMOUNT = 10000.00;

export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    const validated = transferSchema.parse(transaction);

    const amount = parseFloat(validated.amount);
    if (amount < TRANSFER_MIN_AMOUNT || amount > TRANSFER_MAX_AMOUNT) {
      throw new Error(`Transfer amount must be between $${TRANSFER_MIN_AMOUNT} and $${TRANSFER_MAX_AMOUNT}`);
    }

    if (validated.senderId === validated.receiverId) {
      throw new Error('Cannot transfer funds to yourself');
    }

    const data = {
      channel: 'online',
      category: 'Transfer',
      ...validated
    };

    const ref = await adminDb().collection(COLLECTIONS.transactions).add({
      ...data,
      createdAt: serverTimestamp(),
    });

    await createAuditLog({
      userId: validated.senderId,
      action: 'transfer.create',
      resourceType: 'transaction',
      resourceId: ref.id,
      metadata: { amount: validated.amount, recipientEmail: validated.email },
    });

    return parseStringify({ $id: ref.id, $createdAt: new Date().toISOString(), ...data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

export const getTransactionsByBankId = async ({bankId}: getTransactionsByBankIdProps) => {
  try {
    const col = adminDb().collection(COLLECTIONS.transactions);

    const [sent, received] = await Promise.all([
      col.where('senderBankId', '==', bankId).get(),
      col.where('receiverBankId', '==', bankId).get(),
    ]);

    const documents = [...toDocs(sent), ...toDocs(received)];

    return parseStringify({ total: documents.length, documents });
  } catch (error) {
    console.log(error);
  }
}
