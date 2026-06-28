// ---------------------------------------------------------------------------
// Firebase client SDK initialization.
//
// Only public NEXT_PUBLIC_FIREBASE_* env vars are used here. Never put
// Firebase Admin SDK or server secrets in client code.
// Guards against double initialization during Next.js hot reload.
// ---------------------------------------------------------------------------

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = process.env.NODE_ENV === "test" || !!(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "your-firebase-api-key" &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "your-project-id"
);

/**
 * Get or create the Firebase app instance. During Next.js hot reload,
 * `getApps()` will already contain an app, so we reuse it instead of
 * calling `initializeApp` again (which throws on duplicate name).
 */
function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase configuration is missing or invalid.");
  }
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

let _auth: Auth | null = null;

/**
 * Lazily initialize and cache the Firebase Auth instance.
 * Exported as a function so tests can mock the module without triggering
 * initialization at import time.
 */
export function getFirebaseAuth(): Auth {
  if (_auth) {
    return _auth;
  }
  const app = getFirebaseApp();
  _auth = getAuth(app);
  return _auth;
}

export const auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    return Reflect.get(getFirebaseAuth(), prop, receiver);
  },
});

/** Reset the cached auth instance — used by tests. */
export function _resetFirebaseAuthCache(): void {
  _auth = null;
}

export { firebaseConfig };
