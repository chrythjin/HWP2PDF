"use client";

// ---------------------------------------------------------------------------
// AuthNav — client component showing login/signup or user email + logout.
// Designed to drop into the existing PageLayout header.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { useAuth } from "@/auth/useAuth";

export default function AuthNav() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="text-sm text-zinc-400 dark:text-zinc-600" data-testid="auth-nav-loading">
        로딩 중...
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center space-x-3" data-testid="auth-nav-authenticated">
        <span className="text-sm text-zinc-600 dark:text-zinc-300 max-w-[160px] truncate">
          {user.email}
        </span>
        <button
          onClick={() => void logout()}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          data-testid="logout-button"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3" data-testid="auth-nav-anonymous">
      <Link
        href="/login"
        className="px-3 py-1.5 text-sm font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
      >
        로그인
      </Link>
      <Link
        href="/signup"
        className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm hover:shadow-md transition-shadow"
      >
        회원가입
      </Link>
    </div>
  );
}