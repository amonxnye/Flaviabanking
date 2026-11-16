import "server-only";

// Server-only (not "use server"): callers check the session and bank owner.
// Transfers are created by transferFunds in ./transfer.actions.ts.

import { adminDb, COLLECTIONS, toDocs } from "../firebase/admin";
import { parseStringify } from "../utils";

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
