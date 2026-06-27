'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";
import { z } from "zod";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
  APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
} = process.env;

const profileUpdateSchema = z.object({
  firstName: z.string().min(2).max(50).regex(/^[a-zA-Z\s'-]+$/),
  lastName: z.string().min(2).max(50).regex(/^[a-zA-Z\s'-]+$/),
  address1: z.string().min(5).max(100),
  city: z.string().min(2).max(50),
  state: z.string().length(2).regex(/^[A-Z]{2}$/),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/),
});

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

    const { account } = await createSessionClient();
    const session = await account.get();
    if (session.$id !== userId) {
      throw new Error('Unauthorized: cannot update another user\'s profile');
    }

    const { database } = await createAdminClient();

    const users = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );

    if (users.documents.length === 0) {
      throw new Error('User not found');
    }

    const userDoc = users.documents[0];
    const updated = await database.updateDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      userDoc.$id,
      validated
    );

    return parseStringify(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const exportUserData = async (userId: string) => {
  try {
    const { account } = await createSessionClient();
    const session = await account.get();
    if (session.$id !== userId) {
      throw new Error('Unauthorized');
    }

    const { database } = await createAdminClient();

    const userData = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );

    const bankData = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );

    const allTransactions: any[] = [];
    for (const bank of bankData.documents) {
      const sent = await database.listDocuments(
        DATABASE_ID!,
        TRANSACTION_COLLECTION_ID!,
        [Query.equal('senderBankId', bank.$id)]
      );
      const received = await database.listDocuments(
        DATABASE_ID!,
        TRANSACTION_COLLECTION_ID!,
        [Query.equal('receiverBankId', bank.$id)]
      );
      allTransactions.push(...sent.documents, ...received.documents);
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      profile: userData.documents[0] ? {
        firstName: userData.documents[0].firstName,
        lastName: userData.documents[0].lastName,
        email: userData.documents[0].email,
        address1: userData.documents[0].address1,
        city: userData.documents[0].city,
        state: userData.documents[0].state,
        postalCode: userData.documents[0].postalCode,
      } : null,
      connectedBanks: bankData.documents.length,
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

export const deleteUserAccount = async (userId: string) => {
  try {
    const { account } = await createSessionClient();
    const session = await account.get();
    if (session.$id !== userId) {
      throw new Error('Unauthorized');
    }

    const { database, user } = await createAdminClient();

    const bankDocs = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );
    for (const bank of bankDocs.documents) {
      const sentTxns = await database.listDocuments(
        DATABASE_ID!,
        TRANSACTION_COLLECTION_ID!,
        [Query.equal('senderBankId', bank.$id)]
      );
      for (const txn of sentTxns.documents) {
        await database.deleteDocument(DATABASE_ID!, TRANSACTION_COLLECTION_ID!, txn.$id);
      }
      await database.deleteDocument(DATABASE_ID!, BANK_COLLECTION_ID!, bank.$id);
    }

    const userDocs = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );
    for (const doc of userDocs.documents) {
      await database.deleteDocument(DATABASE_ID!, USER_COLLECTION_ID!, doc.$id);
    }

    await user.delete(userId);

    cookies().delete('appwrite-session');

    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

export const unlinkBankAccount = async (userId: string, bankDocumentId: string) => {
  try {
    const { account } = await createSessionClient();
    const session = await account.get();
    if (session.$id !== userId) {
      throw new Error('Unauthorized');
    }

    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('$id', [bankDocumentId])]
    );

    if (bank.documents.length === 0 || bank.documents[0].userId !== userId) {
      throw new Error('Bank account not found or unauthorized');
    }

    await database.deleteDocument(DATABASE_ID!, BANK_COLLECTION_ID!, bankDocumentId);

    return { success: true };
  } catch (error) {
    console.error('Error unlinking bank account:', error);
    throw error;
  }
};
