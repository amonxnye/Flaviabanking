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

// ioTec collects UGX (no minor units); enforce a sane range.
const MIN_AMOUNT = 500; // UGX
const MAX_AMOUNT = 5_000_000; // UGX
const PAGE_SIZE = 100;
const MAX_PAGES = 50; // safety cap: up to 5,000 rows summed

const collectSchema = z.object({
  phone: z.string().min(9, "Enter a valid phone number"),
  amount: z
    .number({ invalid_type_error: "Enter a valid amount" })
    .int("Amount must be a whole number of shillings")
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
 * Initiate a mobile-money collection from a payer.
 *
 * Ordering matters: we persist a Pending ledger row BEFORE calling ioTec so the
 * row always exists by the time a webhook or poll reports back (no race). If the
 * ioTec call fails, the row is marked Failed. The amount only counts toward the
 * balance once the status is confirmed Success.
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
  const useLedger = ledgerConfigured();
  let ledgerDocId: string | null = null;

  // 1. Create the Pending row first.
  if (useLedger) {
    try {
      const { database } = await createAdminClient();
      const doc = await database.createDocument(
        DATABASE_ID!,
        WALLET_TX_COLLECTION_ID!,
        ID.unique(),
        {
          userId: loggedIn.$id,
          iotecTransactionId: "",
          externalId,
          amount: parsed.data.amount,
          currency: "UGX",
          phone: msisdn,
          channel: parsed.data.channel,
          status: "Pending" as IotecStatus,
          note: parsed.data.note || "",
          direction: "collection",
        }
      );
      ledgerDocId = doc.$id;
    } catch (error) {
      console.error("Failed to create wallet ledger entry:", error);
    }
  }

  // 2. Initiate with ioTec. On failure, mark the row Failed and surface it.
  let txn;
  try {
    txn = await initiateCollection({
      amount: parsed.data.amount,
      payer: msisdn,
      channel: parsed.data.channel,
      externalId,
      payerNote: parsed.data.note,
    });
  } catch (error) {
    if (useLedger && ledgerDocId) {
      try {
        const { database } = await createAdminClient();
        await database.updateDocument(
          DATABASE_ID!,
          WALLET_TX_COLLECTION_ID!,
          ledgerDocId,
          { status: "Failed" as IotecStatus }
        );
      } catch (e) {
        console.error("Failed to mark ledger entry failed:", e);
      }
    }
    throw error;
  }

  // 3. Backfill the ioTec transaction id and its initial status.
  if (useLedger && ledgerDocId) {
    try {
      const { database } = await createAdminClient();
      await database.updateDocument(
        DATABASE_ID!,
        WALLET_TX_COLLECTION_ID!,
        ledgerDocId,
        {
          iotecTransactionId: txn.id,
          status: (txn.status as IotecStatus) || "Pending",
        }
      );
    } catch (error) {
      console.error("Failed to update wallet ledger entry:", error);
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
  await syncLedgerStatus(transactionId, txn.status as IotecStatus, txn.externalId as string | undefined);

  return parseStringify({
    transactionId: txn.id,
    status: txn.status,
    statusMessage: txn.statusMessage || "",
    settled: isSuccess(txn.status as IotecStatus),
    failed: isFailure(txn.status as IotecStatus),
  });
};

/**
 * Update the persisted status of a collection. Looks up by ioTec transaction id,
 * falling back to externalId (covers the narrow window before the id is backfilled).
 * Idempotent: repeated callbacks with the same status are harmless.
 */
export async function syncLedgerStatus(
  iotecTransactionId: string,
  status: IotecStatus,
  externalId?: string
) {
  if (!ledgerConfigured()) return;

  try {
    const { database } = await createAdminClient();

    let existing = await database.listDocuments(
      DATABASE_ID!,
      WALLET_TX_COLLECTION_ID!,
      [Query.equal("iotecTransactionId", [iotecTransactionId])]
    );

    if (existing.documents.length === 0 && externalId) {
      existing = await database.listDocuments(
        DATABASE_ID!,
        WALLET_TX_COLLECTION_ID!,
        [Query.equal("externalId", [externalId])]
      );
    }

    if (existing.documents.length === 0) return;

    const doc = existing.documents[0];
    const patch: Record<string, unknown> = { status };
    // Backfill the id if the row was matched by externalId before it was set.
    if (!doc.iotecTransactionId && iotecTransactionId) {
      patch.iotecTransactionId = iotecTransactionId;
    }

    await database.updateDocument(
      DATABASE_ID!,
      WALLET_TX_COLLECTION_ID!,
      doc.$id,
      patch
    );
    revalidatePath("/wallet");
  } catch (error) {
    console.error("Failed to sync ledger status:", error);
  }
}

/**
 * Wallet balance = sum of ALL confirmed (Success) collections for this user
 * (paginated, not just the latest page), plus the recent ledger for display.
 */
export const getWallet = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) return parseStringify({ balance: 0, currency: "UGX", transactions: [] });

  if (!ledgerConfigured()) {
    return parseStringify({ balance: 0, currency: "UGX", transactions: [], notConfigured: true });
  }

  try {
    const { database } = await createAdminClient();

    // Recent entries for display.
    const recent = await database.listDocuments(
      DATABASE_ID!,
      WALLET_TX_COLLECTION_ID!,
      [Query.equal("userId", [loggedIn.$id]), Query.orderDesc("$createdAt"), Query.limit(PAGE_SIZE)]
    );

    const transactions = recent.documents.map((doc) => ({
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

    // Balance across ALL confirmed collections, paginated.
    let balance = 0;
    for (let page = 0; page < MAX_PAGES; page++) {
      const chunk = await database.listDocuments(
        DATABASE_ID!,
        WALLET_TX_COLLECTION_ID!,
        [
          Query.equal("userId", [loggedIn.$id]),
          Query.equal("status", ["Success"]),
          Query.limit(PAGE_SIZE),
          Query.offset(page * PAGE_SIZE),
        ]
      );
      balance += chunk.documents.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      if (chunk.documents.length < PAGE_SIZE) break;
    }

    return parseStringify({ balance, currency: "UGX", transactions });
  } catch (error) {
    console.error("Failed to load wallet:", error);
    return parseStringify({ balance: 0, currency: "UGX", transactions: [] });
  }
};
