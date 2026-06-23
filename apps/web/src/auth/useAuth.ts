"use client";

// ---------------------------------------------------------------------------
// useAuth — convenience hook to consume the AuthContext.
// Throws if used outside of <AuthProvider>.
// ---------------------------------------------------------------------------

import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "./AuthProvider";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}

export type { AuthContextValue } from "./AuthProvider";