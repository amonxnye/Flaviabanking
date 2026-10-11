import "server-only";

import { cookies } from "next/headers";
import { adminAuth } from "./firebase/admin";

// "__session" is the one cookie name Firebase infrastructure always forwards.
export const SESSION_COOKIE = "__session";
const SESSION_DAYS = 5; // Firebase allows up to 14

/** Exchange a fresh Firebase ID token for an httpOnly session cookie. */
export async function createSessionCookie(idToken: string): Promise<{ uid: string }> {
  const decoded = await adminAuth().verifyIdToken(idToken);
  const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
  const cookie = await adminAuth().createSessionCookie(idToken, { expiresIn });

  cookies().set(SESSION_COOKIE, cookie, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: expiresIn / 1000,
  });

  return { uid: decoded.uid };
}

/** Returns the signed-in user's uid, or null if there is no valid session. */
export async function getSessionUid(): Promise<string | null> {
  const cookie = cookies().get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie);
    return decoded.uid;
  } catch {
    return null;
  }
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}
