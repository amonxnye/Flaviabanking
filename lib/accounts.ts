import "server-only";

// Server-only account loaders. They take a userId and do no session check:
// server actions (lib/actions/bank.actions.ts) and the signed AgentStudio tool
// route authenticate first, then call these.

import { CountryCode } from "plaid";

import { plaidClient } from "./plaid";
import { parseStringify } from "./utils";

import { getTransactionsByBankId } from "./actions/transaction.actions";
import { getBanks, getBank } from "./banks";
import { refreshPendingTransfers } from "./transfers";

// Upper bound on Plaid sync pages per load (100 transactions per page).
const MAX_SYNC_PAGES = 10;

export const loadAccountsForUser = async ({ userId }: getAccountsProps) => {
  try {
    const banks = await getBanks({ userId });

    if (!banks || banks.length === 0) {
      return parseStringify({ data: [], totalBanks: 0, totalCurrentBalance: 0 });
    }

    const accounts = await Promise.all(
      banks.map(async (bank: Bank) => {
        const accountsResponse = await plaidClient.accountsGet({
          access_token: bank.accessToken,
        });
        const accountData = accountsResponse.data.accounts[0];

        const institution = await getInstitution({
          institutionId: accountsResponse.data.item.institution_id!,
        });

        const account = {
          id: accountData.account_id,
          availableBalance: accountData.balances.available!,
          currentBalance: accountData.balances.current!,
          institutionId: institution.institution_id,
          name: accountData.name,
          officialName: accountData.official_name,
          mask: accountData.mask!,
          type: accountData.type as string,
          subtype: accountData.subtype! as string,
          appwriteItemId: bank.$id,
          shareableId: bank.shareableId,
        };

        return account;
      })
    );

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total, account) => {
      return total + account.currentBalance;
    }, 0);

    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
    return parseStringify({ data: [], totalBanks: 0, totalCurrentBalance: 0 });
  }
};

/** Load one bank account, only if it belongs to userId. */
export const loadAccountForUser = async (userId: string, appwriteItemId: string) => {
  try {
    const bank = await getBank(appwriteItemId);

    if (!bank || bank.userId !== userId) {
      return parseStringify({ data: null, transactions: [] });
    }

    const accountsResponse = await plaidClient.accountsGet({
      access_token: bank.accessToken,
    });
    const accountData = accountsResponse.data.accounts[0];

    const transferTransactionsData = await getTransactionsByBankId({
      bankId: bank.$id,
    });
    const transferDocs: Transaction[] = await refreshPendingTransfers<any>(transferTransactionsData?.documents || []);

    const transferTransactions = transferDocs.map(
      (transferData: Transaction) => ({
        id: transferData.$id,
        name: transferData.name!,
        amount: transferData.amount!,
        date: transferData.$createdAt,
        paymentChannel: transferData.channel,
        category: transferData.category,
        type: transferData.senderBankId === bank.$id ? "debit" : "credit",
        transferStatus: transferData.status,
      })
    );

    const institution = await getInstitution({
      institutionId: accountsResponse.data.item.institution_id!,
    });

    const transactions = await getTransactions({
      accessToken: bank.accessToken,
    });

    const account = {
      id: accountData.account_id,
      availableBalance: accountData.balances.available!,
      currentBalance: accountData.balances.current!,
      institutionId: institution.institution_id,
      name: accountData.name,
      officialName: accountData.official_name,
      mask: accountData.mask!,
      type: accountData.type as string,
      subtype: accountData.subtype! as string,
      appwriteItemId: bank.$id,
    };

    const allTransactions = [...(transactions || []), ...transferTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return parseStringify({
      data: account,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
    return parseStringify({ data: null, transactions: [] });
  }
};

export const getInstitution = async ({
  institutionId,
}: getInstitutionProps) => {
  try {
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });

    return parseStringify(institutionResponse.data.institution);
  } catch (error) {
    console.error("An error occurred while getting the institution:", error);
    return { institution_id: institutionId, name: 'Unknown Institution' };
  }
};

export const getTransactions = async ({
  accessToken,
}: getTransactionsProps) => {
  let hasMore = true;
  let cursor: string | undefined;
  let pages = 0;
  const transactions: any[] = [];

  try {
    // Each call must pass the previous next_cursor, or Plaid returns page 1
    // again and has_more never turns false.
    while (hasMore && pages < MAX_SYNC_PAGES) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor,
      });

      const data = response.data;
      pages += 1;

      transactions.push(...data.added.map((transaction) => ({
        id: transaction.transaction_id,
        name: transaction.name,
        paymentChannel: transaction.payment_channel,
        type: transaction.payment_channel,
        accountId: transaction.account_id,
        amount: transaction.amount,
        pending: transaction.pending,
        category: transaction.category ? transaction.category[0] : "",
        date: transaction.date,
        image: transaction.logo_url,
      })));

      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    return parseStringify(transactions);
  } catch (error) {
    console.error("An error occurred while getting the transactions:", error);
    return [];
  }
};
