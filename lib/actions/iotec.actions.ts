"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { adminDb, COLLECTIONS, serverTimestamp, toDoc } from "../firebase/admin";
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
import { loadWalletForUser, type LedgerDoc } from "../wallet-ledger";

const ledger = () => adminDb().collection(COLLECTIONS.walletTransactions);

// ioTec collects UGX (no minor units); enforce a sane range.
const MIN_AMOUNT = 500; // UGX
const MAX_AMOUNT = 5_000_000; // UGX

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

  const externalId = randomUUID();
  let ledgerDocId: string | null = null;

  // 1. Create the Pending row first.
  try {
    const doc = await ledger().add({
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
      createdAt: serverTimestamp(),
    });
    ledgerDocId = doc.id;
  } catch (error) {
    console.error("Failed to create wallet ledger entry:", error);
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
    if (ledgerDocId) {
      try {
        await ledger().doc(ledgerDocId).update({ status: "Failed" as IotecStatus });
      } catch (e) {
        console.error("Failed to mark ledger entry failed:", e);
      }
    }
    throw error;
  }

  // 3. Backfill the ioTec transaction id and its initial status.
  if (ledgerDocId) {
    try {
      await ledger().doc(ledgerDocId).update({
        iotecTransactionId: txn.id,
        status: (txn.status as IotecStatus) || "Pending",
      });
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
  try {
    let existing = await ledger()
      .where("iotecTransactionId", "==", iotecTransactionId)
      .limit(1)
      .get();

    if (existing.empty && externalId) {
      existing = await ledger().where("externalId", "==", externalId).limit(1).get();
    }

    if (existing.empty) return;

    const doc = toDoc<LedgerDoc>(existing.docs[0])!;
    const patch: Record<string, unknown> = { status };
    // Backfill the id if the row was matched by externalId before it was set.
    if (!doc.iotecTransactionId && iotecTransactionId) {
      patch.iotecTransactionId = iotecTransactionId;
    }

    await ledger().doc(doc.$id).update(patch);
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

  return parseStringify(await loadWalletForUser(loggedIn.$id));
};
