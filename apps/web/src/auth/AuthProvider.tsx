"use client";

// ---------------------------------------------------------------------------
// AuthProvider — client-side Firebase Auth context provider.
//
// Wraps the app in a React context that tracks the Firebase user, loading
// state, and exposes login/signup/logout actions. Uses onAuthStateChanged
// so the user persists across reloads via Firebase's session management.
// ---------------------------------------------------------------------------

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "인증 중 오류가 발생했습니다.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      });

      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error("Failed to initialize Firebase Auth listener:", err);
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    if (!isFirebaseConfigured) {
      setError("Firebase가 구성되지 않아 로그인할 수 없습니다.");
      return;
    }
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      // Immediately set user state after successful sign-in to avoid race
      // condition where onAuthStateChanged hasn't fired yet but the component
      // already navigated away (e.g. router.push("/")).
      setUser(getFirebaseAuth().currentUser);
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      throw err;
    }
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    setError(null);
    if (!isFirebaseConfigured) {
      setError("Firebase가 구성되지 않아 회원가입할 수 없습니다.");
      return;
    }
    try {
      await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    if (!isFirebaseConfigured) {
      setError("Firebase가 구성되지 않았습니다.");
      return;
    }
    try {
      await signOut(getFirebaseAuth());
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error, login, signup, logout, clearError }),
    [user, loading, error, login, signup, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
