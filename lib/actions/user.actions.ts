'use server';

import { parseStringify } from "../utils";
import { createAuditLog } from "../audit";
import { adminAuth, adminDb, COLLECTIONS, serverTimestamp, toDoc } from "../firebase/admin";
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
 * Called after the browser created the Firebase Auth user. Creates the profile
 * document, then starts the session. If anything fails the just-created auth
 * user is removed so the email can be retried.
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

    const profile = {
      ...userData,
      userId: uid,
      name: `${firstName} ${lastName}`,
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
