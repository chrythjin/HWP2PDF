"use client";

// ---------------------------------------------------------------------------
// Board list page — members-only board with category filter and pagination.
//
// The API enforces authentication; this page shows a login prompt when the
// user is not authenticated. UI gating (notice write link) is convenience
// only — the API is the authority. See plan D8.
// ---------------------------------------------------------------------------

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/auth/useAuth";
import { useBoardClaims } from "@/hooks/useBoardClaims";
import { fetchWithAuth } from "@/lib/api-client";
import {
  API_ROUTES,
  BOARD_CATEGORIES,
  type BoardCategory,
  type BoardListResponse,
} from "@hwp2pdf/shared";

const CATEGORY_LABELS: Record<BoardCategory, string> = {
  general: "자유게시판",
  qna: "질문답변",
  notice: "공지사항",
};

export default function BoardListPage() {
  const { user, loading: authLoading } = useAuth();
  const { admin } = useBoardClaims();

  const [list, setList] = useState<BoardListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<BoardCategory | "all">("all");
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(false);

  const fetchList = useCallback(async () => {
    if (!user) return;
    setLoadingList(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (category !== "all") {
        params.set("category", category);
      }
      const route = `${API_ROUTES.BOARD_POSTS}?${params.toString()}`;
      const res = await fetchWithAuth(route, user, { method: "GET" });
      if (res.status === 401) {
        setError("인증이 필요합니다. 로그인 후 이용해주세요.");
        return;
      }
      if (res.status === 403) {
        setError("접근 권한이 없습니다.");
        return;
      }
      if (!res.ok) {
        setError("게시판 목록을 불러오지 못했습니다.");
        return;
      }
      const data: BoardListResponse = await res.json();
      setList(data);
    } catch {
      setError("게시판 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingList(false);
    }
  }, [user, page, category]);

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      void fetchList();
    });
  }, [user, fetchList]);

  // ---- Loading state ----
  if (authLoading) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-6 py-20">
          <p className="text-sm text-zinc-400" data-testid="board-loading">
            로딩 중...
          </p>
        </div>
      </PageLayout>
    );
  }

  // ---- Unauthenticated: login prompt ----
  if (!user) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-6 py-20" data-testid="board-login-prompt">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            게시판
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
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

  // ---- Authenticated board list ----
  const posts = list?.data ?? [];
  const meta = list?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            게시판
          </h1>
          <Link
            href="/board/write"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-blue-500/20 transition-all"
            data-testid="board-write-button"
          >
            글쓰기
          </Link>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 mb-6" data-testid="board-category-filter">
          <button
            onClick={() => {
              setCategory("all");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              category === "all"
                ? "bg-blue-500 text-white"
                : "bg-white/40 dark:bg-zinc-900/30 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"
            }`}
          >
            전체
          </button>
          {BOARD_CATEGORIES.map((cat) => {
            // Hide notice filter for non-admin users (convenience gating).
            if (cat === "notice" && !admin) return null;
            return (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  category === cat
                    ? "bg-blue-500 text-white"
                    : "bg-white/40 dark:bg-zinc-900/30 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"
                }`}
                data-testid={`board-category-${cat}`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm" data-testid="board-error">
            {error}
          </div>
        )}

        {loadingList && (
          <p className="text-sm text-zinc-400" data-testid="board-list-loading">
            불러오는 중...
          </p>
        )}

        {/* Post list */}
        {!loadingList && posts.length === 0 && !error && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center" data-testid="board-empty">
            게시글이 없습니다.
          </p>
        )}

        {posts.length > 0 && (
          <div className="space-y-2" data-testid="board-post-list">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/board/${post.id}`}
                className="block p-4 rounded-xl bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                data-testid={`board-post-row-${post.id}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 ${
                        post.category === "notice"
                          ? "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                          : post.category === "qna"
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                            : "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {CATEGORY_LABELS[post.category]}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {post.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                    <span>{post.authorName}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8" data-testid="board-pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              data-testid="board-prev-page"
            >
              이전
            </button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              data-testid="board-next-page"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}