"use server";

import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "../appwrite";
import { getLoggedInUser } from "./user.actions";
import { createAuditLog } from "../audit";
import { parseStringify } from "../utils";
import {
  initiateCollection,
  getTransactionStatus,
  isSuccess,
  isFailure,
  type IotecStatus,
} from "../iotec/client";
import { normalizeUgandanMsisdn } from "../iotec/phone";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_WALLET_TX_COLLECTION_ID: WALLET_TX_COLLECTION_ID,
} = process.env;

// $1 floor equivalent — ioTec collects UGX; enforce a sane range.
const MIN_AMOUNT = 500; // UGX
const MAX_AMOUNT = 5_000_000; // UGX

const collectSchema = z.object({
  phone: z.string().min(9, "Enter a valid phone number"),
  amount: z
    .number({ invalid_type_error: "Enter a valid amount" })
    .min(MIN_AMOUNT, `Minimum collection is ${MIN_AMOUNT} UGX`)
    .max(MAX_AMOUNT, `Maximum collection is ${MAX_AMOUNT} UGX`),
  channel: z.enum(["Mtn", "Airtel"]),
  note: z.string().max(140).optional(),
});

export interface CollectInput {
  phone: string;
  amount: number;
  channel: "Mtn" | "Airtel";
  note?: string;
}

function ledgerConfigured(): boolean {
  return Boolean(DATABASE_ID && WALLET_TX_COLLECTION_ID);
}

/**
 * Initiate a mobile-money collection from a payer. Persists a Pending ledger
 * entry immediately; the amount only counts toward the balance once confirmed
 * Success (via checkCollectionStatus or the webhook).
 */
export const collectFromUser = async (input: CollectInput) => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) throw new Error("You must be signed in to collect payments.");

  const parsed = collectSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }

  const msisdn = normalizeUgandanMsisdn(parsed.data.phone);
  if (!msisdn) {
    throw new Error("Enter a valid Ugandan mobile number (e.g. 0772123456).");
  }

  const externalId = ID.unique();

  const txn = await initiateCollection({
    amount: parsed.data.amount,
    payer: msisdn,
    channel: parsed.data.channel,
    externalId,
    payerNote: parsed.data.note,
  });

  if (ledgerConfigured()) {
    try {
      const { database } = await createAdminClient();
      await database.createDocument(
        DATABASE_ID!,
        WALLET_TX_COLLECTION_ID!,
        ID.unique(),
        {
          userId: loggedIn.$id,
          iotecTransactionId: txn.id,
          externalId,
          amount: parsed.data.amount,
          currency: "UGX",
          phone: msisdn,
          channel: parsed.data.channel,
          status: (txn.status as IotecStatus) || "Pending",
          note: parsed.data.note || "",
          direction: "collection",
        }
      );
    } catch (error) {
      console.error("Failed to persist wallet ledger entry:", error);
    }
  }

  await createAuditLog({
    userId: loggedIn.$id,
    action: "wallet.collection.initiated",
  });

  revalidatePath("/wallet");

  return parseStringify({
    transactionId: txn.id,
    externalId,
    status: (txn.status as IotecStatus) || "Pending",
  });
};

/**
 * Re-query ioTec for the authoritative status and sync the ledger entry.
 * Used both by client-side polling and the webhook (single source of truth).
 */
export const checkCollectionStatus = async (transactionId: string) => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) throw new Error("Unauthorized");

  const txn = await getTransactionStatus(transactionId);
  await syncLedgerStatus(transactionId, txn.status as IotecStatus);

  return parseStringify({
    transactionId: txn.id,
    status: txn.status,
    statusMessage: txn.statusMessage || "",
    settled: isSuccess(txn.status as IotecStatus),
    failed: isFailure(txn.status as IotecStatus),
  });
};

/** Update the persisted status of a collection by its ioTec transaction id. */
export async function syncLedgerStatus(
  iotecTransactionId: string,
  status: IotecStatus
) {
  if (!ledgerConfigured()) return;

  try {
    const { database } = await createAdminClient();
    const existing = await database.listDocuments(
      DATABASE_ID!,
      WALLET_TX_COLLECTION_ID!,
      [Query.equal("iotecTransactionId", [iotecTransactionId])]
    );

    if (existing.documents.length === 0) return;

    await database.updateDocument(
      DATABASE_ID!,
      WALLET_TX_COLLECTION_ID!,
      existing.documents[0].$id,
      { status }
    );
    revalidatePath("/wallet");
  } catch (error) {
    console.error("Failed to sync ledger status:", error);
  }
}

/**
 * Wallet balance = sum of confirmed (Success) collections for this user,
 * plus recent ledger entries for display.
 */
export const getWallet = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) return parseStringify({ balance: 0, currency: "UGX", transactions: [] });

  if (!ledgerConfigured()) {
    return parseStringify({ balance: 0, currency: "UGX", transactions: [], notConfigured: true });
  }

  try {
    const { database } = await createAdminClient();
    const result = await database.listDocuments(
      DATABASE_ID!,
      WALLET_TX_COLLECTION_ID!,
      [Query.equal("userId", [loggedIn.$id]), Query.orderDesc("$createdAt"), Query.limit(100)]
    );

    const transactions = result.documents.map((doc) => ({
      id: doc.$id,
      iotecTransactionId: doc.iotecTransactionId,
      amount: doc.amount,
      currency: doc.currency || "UGX",
      phone: doc.phone,
      channel: doc.channel,
      status: doc.status,
      note: doc.note,
      createdAt: doc.$createdAt,
    }));

    const balance = transactions
      .filter((t) => t.status === "Success")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return parseStringify({ balance, currency: "UGX", transactions });
  } catch (error) {
    console.error("Failed to load wallet:", error);
    return parseStringify({ balance: 0, currency: "UGX", transactions: [] });
  }
};
