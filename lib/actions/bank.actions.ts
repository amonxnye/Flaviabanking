"use server";

import { getSessionUid } from "../session";
import { parseStringify } from "../utils";
import { loadAccountForUser, loadAccountsForUser } from "../accounts";

const EMPTY_ACCOUNTS = { data: [], totalBanks: 0, totalCurrentBalance: 0 };

// Server actions are public endpoints: always take the user from the session.
export const getAccounts = async ({ userId }: getAccountsProps) => {
  const uid = await getSessionUid();
  if (!uid || uid !== userId) return parseStringify(EMPTY_ACCOUNTS);

  return loadAccountsForUser({ userId: uid });
};

export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
  const uid = await getSessionUid();
  if (!uid) return parseStringify({ data: null, transactions: [] });

  return loadAccountForUser(uid, appwriteItemId);
};
