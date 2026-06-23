"use client";

// ---------------------------------------------------------------------------
// useBoardClaims — hook to read Firebase custom claims (admin, boardModerator)
// from the current user's ID token result.
//
// UI gating is convenience only — the API is the authority. See plan D8.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import type { IdTokenResult } from "firebase/auth";
import { useAuth } from "@/auth/useAuth";

export interface BoardClaims {
  admin: boolean;
  boardModerator: boolean;
  loading: boolean;
}

export function useBoardClaims(): BoardClaims {
  const { user, loading: authLoading } = useAuth();
  const [claims, setClaims] = useState<BoardClaims>({
    admin: false,
    boardModerator: false,
    loading: true,
  });

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      queueMicrotask(() => {
        setClaims({ admin: false, boardModerator: false, loading: false });
      });
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      user
        .getIdTokenResult(true)
        .then((result: IdTokenResult) => {
          if (cancelled) return;
          setClaims({
            admin: result.claims.admin === true,
            boardModerator: result.claims.boardModerator === true,
            loading: false,
          });
        })
        .catch(() => {
          if (cancelled) return;
          setClaims({ admin: false, boardModerator: false, loading: false });
        });
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return claims;
}