"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { adminDb, COLLECTIONS, serverTimestamp, toDoc, toDocs } from "../firebase/admin";
import { getSessionUid } from "../session";
import { parseStringify } from "../utils";
import { createAuditLog } from "../audit";
import { checkBankLimit, type PlanTier } from "../plans";
import { getTransactionsByAccountId } from "./transaction.actions";

/**
 * Manually managed financial-institution accounts (Firestore `accounts`).
 * Every action resolves the user from the session cookie and only ever
 * touches documents whose userId matches it.
 */

const ACCOUNT_TYPES = ["depository", "credit", "loan", "investment", "other"] as const;

const accountSchema = z.object({
  name: z.string().trim().min(2, "Account name is too short").max(60),
  // Empty = the user's own account; otherwise the client it is managed for.
  holder: z.string().trim().max(80).optional().default(""),
  institution: z.string().trim().min(2, "Institution name is too short").max(80),
  type: z.enum(ACCOUNT_TYPES),
  subtype: z.string().trim().max(40).optional().default(""),
  mask: z
    .string()
    .trim()
    .regex(/^\d{0,4}$/, "Enter the last 4 digits only")
    .optional()
    .default(""),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code (e.g. UGX)"),
  balance: z.number({ invalid_type_error: "Enter a valid balance" }).finite(),
});

export type AccountInput = z.input<typeof accountSchema>;

// Stored document shape.
interface AccountDoc {
  $id: string;
  $createdAt: string;
  userId: string;
  name: string;
  holder?: string;
  institution: string;
  type: string;
  subtype?: string;
  mask?: string;
  currency?: string;
  balance?: number;
}

const toAccount = (doc: AccountDoc): Account => ({
  id: doc.$id,
  userId: doc.userId,
  name: doc.name,
  holder: doc.holder || "",
  institution: doc.institution,
  type: doc.type,
  subtype: doc.subtype || "",
  mask: doc.mask || "",
  currency: doc.currency || "USD",
  currentBalance: Number(doc.balance) || 0,
  availableBalance: Number(doc.balance) || 0,
  $createdAt: doc.$createdAt,
});

const accountsRef = () => adminDb().collection(COLLECTIONS.accounts);

async function requireUid() {
  const uid = await getSessionUid();
  if (!uid) throw new Error("Please sign in.");
  return uid;
}

/** Load an account only if it belongs to `uid`. */
async function getOwnedAccount(uid: string, accountId: string): Promise<AccountDoc | null> {
  if (!accountId) return null;
  const doc = toDoc<AccountDoc>(await accountsRef().doc(accountId).get());
  return doc && doc.userId === uid ? doc : null;
}

export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    const snap = await accountsRef().where("userId", "==", userId).get();
    const accounts = toDocs<AccountDoc>(snap)
      .map(toAccount)
      .sort((a, b) => (a.$createdAt || "").localeCompare(b.$createdAt || ""));

    // The headline total is in the first account's currency; balances in
    // other currencies are not converted, so they are left out of it.
    const currency = accounts[0]?.currency || "USD";
    const totalCurrentBalance = accounts
      .filter((a) => a.currency === currency)
      .reduce((total, a) => total + a.currentBalance, 0);

    return parseStringify({ data: accounts, totalBanks: accounts.length, totalCurrentBalance, currency });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
    return parseStringify({ data: [], totalBanks: 0, totalCurrentBalance: 0, currency: "USD" });
  }
};

/** One account plus its transfer history. Only the owner can read it. */
export const getAccount = async ({ accountId }: getAccountProps) => {
  try {
    const uid = await requireUid();
    const doc = await getOwnedAccount(uid, accountId);
    if (!doc) return parseStringify({ data: null, transactions: [] });

    const account = toAccount(doc);
    const history = await getTransactionsByAccountId({ accountId: account.id });

    const transactions: Transaction[] = (history?.documents || [])
      .map((t: Transaction) => ({
        id: t.$id,
        name: t.name,
        amount: t.amount,
        date: t.$createdAt,
        paymentChannel: t.channel,
        category: t.category,
        type: t.senderBankId === account.id ? "debit" : "credit",
      }));
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return parseStringify({ data: account, transactions });
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
    return parseStringify({ data: null, transactions: [] });
  }
};

export const createAccount = async (input: AccountInput) => {
  const uid = await requireUid();
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join(", "));

  const existing = await accountsRef().where("userId", "==", uid).count().get();
  const user = toDoc<{ planTier?: PlanTier }>(await adminDb().collection(COLLECTIONS.users).doc(uid).get());
  const limit = checkBankLimit(existing.data().count, user?.planTier || "free");
  if (!limit.allowed) throw new Error(limit.message);

  const ref = await accountsRef().add({ ...parsed.data, userId: uid, createdAt: serverTimestamp() });

  await createAuditLog({ userId: uid, action: "bank.connect", resourceType: "account", resourceId: ref.id });
  revalidatePath("/");
  revalidatePath("/my-banks");

  return parseStringify({ id: ref.id });
};

export const updateAccount = async (accountId: string, input: AccountInput) => {
  const uid = await requireUid();
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.errors.map((e) => e.message).join(", "));

  const doc = await getOwnedAccount(uid, accountId);
  if (!doc) throw new Error("Account not found.");

  await accountsRef().doc(accountId).update(parsed.data);

  await createAuditLog({ userId: uid, action: "settings.update", resourceType: "account", resourceId: accountId });
  revalidatePath("/");
  revalidatePath("/my-banks");

  return parseStringify({ id: accountId });
};

export const deleteAccount = async (accountId: string) => {
  const uid = await requireUid();
  const doc = await getOwnedAccount(uid, accountId);
  if (!doc) throw new Error("Account not found.");

  await accountsRef().doc(accountId).delete();

  await createAuditLog({ userId: uid, action: "bank.unlink", resourceType: "account", resourceId: accountId });
  revalidatePath("/");
  revalidatePath("/my-banks");

  return { success: true };
};
