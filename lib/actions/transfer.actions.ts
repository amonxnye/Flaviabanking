"use server";

import { z } from "zod";

import { adminDb, COLLECTIONS, serverTimestamp } from "../firebase/admin";
import { getSessionUid } from "../session";
import { getBank, getBankByAccountId } from "../banks";
import { createTransfer } from "./dwolla.actions";
import { createAuditLog } from "../audit";
import { decryptId } from "../utils";
import { checkTransferLimit, getPlanForUser } from "../plans";

const TRANSFER_MIN_AMOUNT = 1.0;
const TRANSFER_MAX_AMOUNT = 10000.0;

const transferSchema = z.object({
  idempotencyKey: z.string().uuid("Invalid request. Refresh the page and try again."),
  senderBankId: z.string().min(1, "Please select a valid bank account"),
  sharableId: z.string().min(8, "Please enter a valid sharable ID"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 25 or 25.50"),
  name: z.string().trim().min(1).max(200),
  email: z.string().email("Invalid email address"),
});

export type TransferFundsInput = z.infer<typeof transferSchema>;

/**
 * ok: the transfer was started (or was already started with this key).
 * error + retryable: the outcome is unknown; resend with the SAME key.
 * error without retryable: nothing was sent; a new attempt needs a new key.
 */
export type TransferFundsResult =
  | { ok: true; transactionId: string }
  | { ok: false; error: string; retryable?: boolean };

const fail = (error: string, retryable = false): TransferFundsResult => ({ ok: false, error, retryable });

const isAlreadyExists = (error: unknown) => (error as { code?: unknown })?.code === 6;

/**
 * Start a bank transfer for the signed-in user. Every check runs on the server
 * and before any money moves. The transfer record is written first (status
 * "pending"), keyed by the idempotency key, so double clicks and retries can
 * never start a second transfer.
 */
export async function transferFunds(input: TransferFundsInput): Promise<TransferFundsResult> {
  const uid = await getSessionUid();
  if (!uid) return fail("Please sign in again.");

  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.errors.map((e) => e.message).join(", "));
  const data = parsed.data;

  const col = adminDb().collection(COLLECTIONS.transactions);
  const ref = col.doc(data.idempotencyKey);

  // Retry of an earlier attempt with the same key.
  const existing = await ref.get();
  if (existing.exists) {
    const prior = existing.data() as Record<string, string>;
    if (prior.senderId !== uid) return fail("Invalid request. Refresh the page and try again.");
    if (prior.status === "failed") return fail("This transfer failed. Start a new one.");
    if (prior.dwollaTransferUrl) return { ok: true, transactionId: ref.id };
    if (prior.amount !== data.amount || prior.senderBankId !== data.senderBankId) {
      return fail("An earlier transfer is still being confirmed. Refresh the page before you send a different one.");
    }
    // The earlier attempt never got an answer from Dwolla: resend with the same key.
    return startDwollaTransfer(uid, ref, data.idempotencyKey, prior.senderBankId, prior.receiverBankId, prior.amount);
  }

  const amount = Number(data.amount);
  if (amount < TRANSFER_MIN_AMOUNT || amount > TRANSFER_MAX_AMOUNT) {
    return fail(`Transfer amount must be between $${TRANSFER_MIN_AMOUNT} and $${TRANSFER_MAX_AMOUNT}`);
  }

  let receiverAccountId: string;
  try {
    // Decoded here, not in the browser: the signing secret is server-only.
    receiverAccountId = decryptId(data.sharableId);
  } catch {
    return fail("That sharable ID is not valid. Check it and try again.");
  }

  const [senderBank, receiverBank] = await Promise.all([
    getBank(data.senderBankId),
    getBankByAccountId(receiverAccountId),
  ]);
  if (!senderBank || senderBank.userId !== uid) return fail("Please select one of your own bank accounts.");
  if (!receiverBank) return fail("Could not find the receiver's bank account. Check the sharable ID.");
  if (receiverBank.userId === uid) return fail("You cannot transfer funds to yourself.");

  const limit = await checkPlanLimit(uid, amount);
  if (!limit.allowed) return fail(limit.message || "This transfer is over your plan limit.");

  try {
    await ref.create({
      name: data.name,
      amount: data.amount,
      email: data.email,
      senderId: uid,
      senderBankId: senderBank.$id,
      receiverId: receiverBank.userId,
      receiverBankId: receiverBank.$id,
      channel: "online",
      category: "Transfer",
      status: "pending",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // A concurrent click with the same key already created it.
    if (isAlreadyExists(error)) return { ok: true, transactionId: ref.id };
    console.error("Failed to record transfer:", error);
    return fail("The transfer could not be started. No money was moved. Please try again.");
  }

  await createAuditLog({
    userId: uid,
    action: "transfer.create",
    resourceType: "transaction",
    resourceId: ref.id,
    metadata: { amount: data.amount, recipientEmail: data.email },
  });

  return startDwollaTransfer(uid, ref, data.idempotencyKey, senderBank.$id, receiverBank.$id, data.amount);
}

async function checkPlanLimit(uid: string, amount: number) {
  const profile = await adminDb().collection(COLLECTIONS.users).doc(uid).get();
  const plan = getPlanForUser(profile.data()?.planTier);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const sentThisMonth = await adminDb()
    .collection(COLLECTIONS.transactions)
    .where("senderId", "==", uid)
    .where("createdAt", ">=", monthStart)
    .count()
    .get();

  return checkTransferLimit(amount, sentThisMonth.data().count, plan.tier);
}

async function startDwollaTransfer(
  uid: string,
  ref: FirebaseFirestore.DocumentReference,
  idempotencyKey: string,
  senderBankId: string,
  receiverBankId: string,
  amount: string
): Promise<TransferFundsResult> {
  const [senderBank, receiverBank] = await Promise.all([getBank(senderBankId), getBank(receiverBankId)]);
  if (!senderBank || senderBank.userId !== uid || !receiverBank) {
    await ref.update({ status: "failed" });
    return fail("A bank account in this transfer is no longer linked. No money was moved.");
  }

  let transferUrl: string;
  try {
    transferUrl = await createTransfer(
      {
        sourceFundingSourceUrl: senderBank.fundingSourceUrl,
        destinationFundingSourceUrl: receiverBank.fundingSourceUrl,
        amount,
      },
      idempotencyKey
    );
  } catch (error) {
    console.error("Dwolla transfer failed:", error);
    // An HTTP error from Dwolla is a definite "no". Anything else (timeout,
    // network) is unknown: keep it pending so a retry with the same key can
    // finish it without moving money twice.
    if ((error as { status?: number })?.status) {
      await ref.update({ status: "failed" }).catch(() => {});
      await createAuditLog({ userId: uid, action: "transfer.fail", resourceType: "transaction", resourceId: ref.id });
      return fail("The bank declined this transfer. No money was moved.");
    }
    return fail("We could not confirm the transfer. Press Transfer Funds again to retry safely.", true);
  }

  try {
    await ref.update({ dwollaTransferUrl: transferUrl });
  } catch (error) {
    // The money is moving, so report success; log the URL for manual repair.
    console.error(`Failed to save Dwolla transfer URL ${transferUrl} for ${ref.id}:`, error);
  }
  return { ok: true, transactionId: ref.id };
}
