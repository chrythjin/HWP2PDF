"use client";

// ---------------------------------------------------------------------------
// Login page — Firebase Auth email/password sign-in.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/auth/useAuth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageLayout showBackground={true}>
      <div className="max-w-md mx-auto px-6 py-20">
        <div className="bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md rounded-3xl p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">로그인</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            HWP2PDF 회원으로 변환 이력을 관리하세요.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="login-email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="login-password"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-500" data-testid="login-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              data-testid="login-submit"
            >
              {submitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-zinc-500 dark:text-zinc-400">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-blue-500 hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </PageLayout>
  );
}