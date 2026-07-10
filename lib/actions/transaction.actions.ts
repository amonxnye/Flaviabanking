"use server";

import { ID, Query } from "node-appwrite";
import { z } from 'zod';
import { createAdminClient } from "../appwrite";
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

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
} = process.env;

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

    const { database } = await createAdminClient();

    const newTransaction = await database.createDocument(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      ID.unique(),
      {
        channel: 'online',
        category: 'Transfer',
        ...validated
      }
    )

    await createAuditLog({
      userId: validated.senderId,
      action: 'transfer.create',
      resourceType: 'transaction',
      resourceId: newTransaction.$id,
      metadata: { amount: validated.amount, recipientEmail: validated.email },
    });

    return parseStringify(newTransaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

export const getTransactionsByBankId = async ({bankId}: getTransactionsByBankIdProps) => {
  try {
    const { database } = await createAdminClient();

    const senderTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('senderBankId', bankId)],
    )

    const receiverTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('receiverBankId', bankId)],
    );

    const transactions = {
      total: senderTransactions.total + receiverTransactions.total,
      documents: [
        ...senderTransactions.documents, 
        ...receiverTransactions.documents,
      ]
    }

    return parseStringify(transactions);
  } catch (error) {
    console.log(error);
  }
}