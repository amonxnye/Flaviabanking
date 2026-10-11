'use server';

import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";

import { plaidClient } from '@/lib/plaid';
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";
import { createAuditLog } from "../audit";
import { adminAuth, adminDb, COLLECTIONS, serverTimestamp, toDoc, toDocs } from "../firebase/admin";
import { clearSessionCookie, createSessionCookie, getSessionUid } from "../session";

// User profile documents live at users/{uid}, so a profile's $id is the
// Firebase Auth uid. `userId` is stored too for backwards-compatible reads.
export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const snap = await adminDb().collection(COLLECTIONS.users).doc(userId).get();
    const user = toDoc(snap);
    return user ? parseStringify(user) : null;
  } catch (error) {
    console.log(error)
    return null;
  }
}

/**
 * Called after the browser signed in with Firebase Auth. Verifies the ID token,
 * checks a profile exists, then stores an httpOnly session cookie.
 * Errors are returned, not thrown: Next.js masks thrown Server Action messages
 * in production, which would hide the real cause from the user.
 */
export const signIn = async ({ idToken }: signInProps) => {
  try {
    const uid = (await adminAuth().verifyIdToken(idToken)).uid;

    const user = await getUserInfo({ userId: uid });
    if (!user) {
      return { error: 'No profile found for this account. Please sign up again.' };
    }

    await createSessionCookie(idToken);
    await createAuditLog({ userId: uid, action: 'user.login' });

    return parseStringify(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid email or password';
    return { error: message };
  }
}

/**
 * Called after the browser created the Firebase Auth user. Creates the Dwolla
 * customer and the profile document, then starts the session. If anything
 * fails the just-created auth user is removed so the email can be retried.
 */
export const signUp = async ({ idToken, ...userData }: CompleteSignUpParams) => {
  const { email, firstName, lastName } = userData;
  let uid: string | undefined;

  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
    if (decoded.email?.toLowerCase() !== email.toLowerCase()) {
      throw new Error('Email does not match the signed-in account');
    }

    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: 'personal'
    })

    if(!dwollaCustomerUrl) throw new Error('Error creating Dwolla customer')

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const profile = {
      ...userData,
      userId: uid,
      name: `${firstName} ${lastName}`,
      dwollaCustomerId,
      dwollaCustomerUrl,
    };

    await adminDb().collection(COLLECTIONS.users).doc(uid).set({
      ...profile,
      createdAt: serverTimestamp(),
    });

    await createSessionCookie(idToken);
    await createAuditLog({ userId: uid, action: 'user.signup' });

    return parseStringify({ $id: uid, ...profile });
  } catch (error) {
    if (uid) {
      await adminAuth().deleteUser(uid).catch((e) => console.error('Rollback of auth user failed:', e));
    }
    const message = error instanceof Error ? error.message : 'Failed to create account';
    return { error: message };
  }
}

export async function getLoggedInUser() {
  try {
    const uid = await getSessionUid();
    if (!uid) return null;

    return await getUserInfo({ userId: uid });
  } catch (error) {
    console.log(error)
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const uid = await getSessionUid();
    if (uid) {
      await createAuditLog({ userId: uid, action: 'user.logout' });
      await adminAuth().revokeRefreshTokens(uid);
    }
    return true;
  } catch (error) {
    return true;
  } finally {
    clearSessionCookie();
  }
}

export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user: {
        client_user_id: user.$id
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ['auth'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    }

    const response = await plaidClient.linkTokenCreate(tokenParams);

    return parseStringify({ linkToken: response.data.link_token })
  } catch (error) {
    console.log(error);
  }
}

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  shareableId,
}: createBankAccountProps) => {
  try {
    const data = {
      userId,
      bankId,
      accountId,
      accessToken,
      fundingSourceUrl,
      shareableId,
    };

    const ref = await adminDb().collection(COLLECTIONS.banks).add({
      ...data,
      createdAt: serverTimestamp(),
    });

    return parseStringify({ $id: ref.id, ...data });
  } catch (error) {
    console.log(error);
  }
}

export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    // Exchange public token for access token and item ID
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    
    // Get account information from Plaid using the access token
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    // Create a processor token for Dwolla using the access token and account ID
    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse = await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;

     // Create a funding source URL for the account using the Dwolla customer ID, processor token, and bank name
     const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });
    
    // If the funding source URL is not created, throw an error
    if (!fundingSourceUrl) throw Error;

    // Create a bank account using the user ID, item ID, account ID, access token, funding source URL, and shareableId ID
    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });

    // Revalidate the path to reflect the changes
    revalidatePath("/");

    // Return a success message
    return parseStringify({
      publicTokenExchange: "complete",
    });
  } catch (error) {
    console.error("An error occurred while creating exchanging token:", error);
  }
}

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const snap = await adminDb()
      .collection(COLLECTIONS.banks)
      .where('userId', '==', userId)
      .get();

    return parseStringify(toDocs(snap));
  } catch (error) {
    console.log(error)
  }
}

export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const snap = await adminDb().collection(COLLECTIONS.banks).doc(documentId).get();
    const bank = toDoc(snap);

    return bank ? parseStringify(bank) : null;
  } catch (error) {
    console.log(error)
  }
}

export const getBankByAccountId = async ({ accountId }: getBankByAccountIdProps) => {
  try {
    const snap = await adminDb()
      .collection(COLLECTIONS.banks)
      .where('accountId', '==', accountId)
      .limit(2)
      .get();

    if(snap.size !== 1) return null;

    return parseStringify(toDoc(snap.docs[0]));
  } catch (error) {
    console.log(error)
  }
}
