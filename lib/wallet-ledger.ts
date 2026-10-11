import "server-only";

import { Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_WALLET_TX_COLLECTION_ID: WALLET_TX_COLLECTION_ID,
} = process.env;

const PAGE_SIZE = 100;
const MAX_PAGES = 50; // safety cap: up to 5,000 confirmed rows summed

// Shape of a wallet ledger row as stored in Appwrite.
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

export function ledgerConfigured(): boolean {
  return Boolean(DATABASE_ID && WALLET_TX_COLLECTION_ID);
}

/**
 * Load a user's wallet: recent entries plus a balance summed across ALL
 * confirmed (Success) collections. No session check here — callers must
 * authenticate the user first.
 */
export async function loadWalletForUser(userId: string): Promise<WalletSnapshot> {
  if (!ledgerConfigured()) {
    return { balance: 0, currency: "UGX", transactions: [], notConfigured: true };
  }

  try {
    const { database } = await createAdminClient();

    const recent = await database.listDocuments(
      DATABASE_ID!,
      WALLET_TX_COLLECTION_ID!,
      [Query.equal("userId", [userId]), Query.orderDesc("$createdAt"), Query.limit(PAGE_SIZE)]
    );

    const transactions = (recent.documents as unknown as LedgerDoc[]).map((doc) => ({
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

    let balance = 0;
    for (let page = 0; page < MAX_PAGES; page++) {
      const chunk = await database.listDocuments(
        DATABASE_ID!,
        WALLET_TX_COLLECTION_ID!,
        [
          Query.equal("userId", [userId]),
          Query.equal("status", ["Success"]),
          Query.limit(PAGE_SIZE),
          Query.offset(page * PAGE_SIZE),
        ]
      );
      balance += (chunk.documents as unknown as LedgerDoc[]).reduce(
        (sum, d) => sum + (Number(d.amount) || 0),
        0
      );
      if (chunk.documents.length < PAGE_SIZE) break;
    }

    return { balance, currency: "UGX", transactions };
  } catch (error) {
    console.error("Failed to load wallet:", error);
    return { balance: 0, currency: "UGX", transactions: [] };
  }
}
