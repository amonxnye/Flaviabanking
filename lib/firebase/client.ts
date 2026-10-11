import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Firebase Web SDK (browser). Only Auth is used client-side: the user signs in
 * here, and the resulting ID token is exchanged for an httpOnly session cookie
 * by a server action. All Firestore access stays on the server (Admin SDK).
 *
 * The NEXT_PUBLIC_FIREBASE_* values are public identifiers, not secrets.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy so a missing config fails at sign-in time with a clear message,
// not at module import during server rendering.
export function getFirebaseAuth(): Auth {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* environment variables.");
  }
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}
