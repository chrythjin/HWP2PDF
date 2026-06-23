"use client";

// ---------------------------------------------------------------------------
// Signup page — Firebase Auth email/password account creation.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/auth/useAuth";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      await signup(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageLayout showBackground={true}>
      <div className="max-w-md mx-auto px-6 py-20">
        <div className="bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md rounded-3xl p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">회원가입</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            회원가입 후 변환 이력을 관리하고 파일을 안전하게 보관하세요.
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
                data-testid="signup-email"
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
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="signup-password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="signup-confirm-password"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-500" data-testid="signup-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              data-testid="signup-submit"
            >
              {submitting ? "가입 중..." : "회원가입"}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-zinc-500 dark:text-zinc-400">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-blue-500 hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </PageLayout>
  );
}