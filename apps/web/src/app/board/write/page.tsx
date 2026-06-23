"use client";

// ---------------------------------------------------------------------------
// Board write page — create a new post.
//
// Form has title, body (textarea), and category select. The notice category
// option is hidden unless the user has the admin custom claim. The author
// field is never in the form — the server derives authorId/authorName from
// the token. UI gating is convenience only — the API enforces authority.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/auth/useAuth";
import { useBoardClaims } from "@/hooks/useBoardClaims";
import { fetchWithAuth } from "@/lib/api-client";
import {
  API_ROUTES,
  BOARD_CATEGORIES,
  type BoardCategory,
  type BoardPost,
} from "@hwp2pdf/shared";

const CATEGORY_LABELS: Record<BoardCategory, string> = {
  general: "자유게시판",
  qna: "질문답변",
  notice: "공지사항",
};

// Categories available to non-admin users (notice excluded).
const MEMBER_CATEGORIES: BoardCategory[] = ["general", "qna"];

export default function BoardWritePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { admin, loading: claimsLoading } = useBoardClaims();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<BoardCategory>("general");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ---- Unauthenticated (check before claims finish loading) ----
  if (!user && !authLoading) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto px-6 py-20" data-testid="board-write-login-prompt">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            게시판은 회원 전용 서비스입니다. 로그인 후 이용해주세요.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-blue-500/20 transition-all"
          >
            로그인
          </Link>
        </div>
      </PageLayout>
    );
  }

  // ---- Loading state ----
  if (authLoading || claimsLoading) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto px-6 py-20">
          <p className="text-sm text-zinc-400" data-testid="board-write-loading">
            로딩 중...
          </p>
        </div>
      </PageLayout>
    );
  }

  // ---- Unauthenticated (fallback) ----
  if (!user) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto px-6 py-20" data-testid="board-write-login-prompt">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            게시판은 회원 전용 서비스입니다. 로그인 후 이용해주세요.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-blue-500/20 transition-all"
          >
            로그인
          </Link>
        </div>
      </PageLayout>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetchWithAuth(API_ROUTES.BOARD_POSTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category }),
      });

      if (res.status === 201) {
        const post: BoardPost = await res.json();
        router.push(`/board/${post.id}`);
        return;
      }

      if (res.status === 401) {
        setError("인증이 필요합니다. 다시 로그인해주세요.");
        return;
      }
      if (res.status === 403) {
        setError("권한이 없습니다. 공지사항은 관리자만 작성할 수 있습니다.");
        return;
      }
      if (res.status === 422) {
        const data = await res.json();
        setError(data?.error?.message ?? "입력값이 올바르지 않습니다.");
        return;
      }
      setError("게시글 작성에 실패했습니다.");
    } catch {
      setError("게시글 작성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  // Available categories: admin sees all, non-admin sees general/qna only.
  const availableCategories = admin ? BOARD_CATEGORIES : MEMBER_CATEGORIES;

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-4">
          <Link href="/board" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-500 transition-colors">
            ← 목록으로
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
          글쓰기
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="board-write-form">
          {/* Category select — notice hidden for non-admin */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              카테고리
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as BoardCategory)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="board-write-category"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Title — no author field */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              제목
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="board-write-title"
            />
          </div>

          {/* Body textarea */}
          <div>
            <label htmlFor="body" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              내용
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              maxLength={10000}
              rows={12}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              data-testid="board-write-body"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-500" data-testid="board-write-error">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              data-testid="board-write-submit"
            >
              {submitting ? "작성 중..." : "작성하기"}
            </button>
            <Link
              href="/board"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}