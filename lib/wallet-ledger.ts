import "server-only";

import { AggregateField } from "firebase-admin/firestore";
import { adminDb, COLLECTIONS, toDocs } from "./firebase/admin";

const PAGE_SIZE = 100;

// Shape of a wallet ledger row as stored in Firestore (walletTransactions).
export interface LedgerDoc {
  $id: string;
  $createdAt: string;
  userId: string;
  iotecTransactionId?: string;
  externalId?: string;
  amount: number;
  currency?: string;
  phone: string;
  channel: string;
  status: string;
  note?: string;
}

export interface WalletSnapshot {
  balance: number;
  currency: string;
  transactions: Array<{
    id: string;
    iotecTransactionId?: string;
    amount: number;
    currency: string;
    phone: string;
    channel: string;
    status: string;
    note?: string;
    createdAt: string;
  }>;
  notConfigured?: boolean;
}

/**
 * Load a user's wallet: recent entries plus a balance summed across ALL
 * confirmed (Success) collections. No session check here — callers must
 * authenticate the user first.
 */
export async function loadWalletForUser(userId: string): Promise<WalletSnapshot> {
  try {
    const ledger = adminDb().collection(COLLECTIONS.walletTransactions);

    const recent = await ledger
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(PAGE_SIZE)
      .get();

    const transactions = toDocs<LedgerDoc>(recent).map((doc) => ({
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

    // Server-side aggregation: one request regardless of row count.
    const sum = await ledger
      .where("userId", "==", userId)
      .where("status", "==", "Success")
      .aggregate({ total: AggregateField.sum("amount") })
      .get();

    const balance = Number(sum.data().total) || 0;

    return { balance, currency: "UGX", transactions };
  } catch (error) {
    console.error("Failed to load wallet:", error);
    return { balance: 0, currency: "UGX", transactions: [] };
  }
}
