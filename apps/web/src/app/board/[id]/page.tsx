"use client";

// ---------------------------------------------------------------------------
// Board detail page — shows a single post with edit/delete controls.
//
// Edit/delete buttons are visible only to the post owner, admin, or
// boardModerator. UI gating is convenience only — the API enforces authority.
// Body is rendered as plain text (no dangerouslySetInnerHTML).
// ---------------------------------------------------------------------------

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageLayout from "@/components/PageLayout";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useAuth } from "@/auth/useAuth";
import { useBoardClaims } from "@/hooks/useBoardClaims";
import { fetchWithAuth } from "@/lib/api-client";
import {
  API_ROUTES,
  type BoardCategory,
  type BoardPost,
} from "@hwp2pdf/shared";

const CATEGORY_LABELS: Record<BoardCategory, string> = {
  general: "자유게시판",
  qna: "질문답변",
  notice: "공지사항",
};

export default function BoardDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = params?.id ?? "";
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { admin, boardModerator } = useBoardClaims();

  const [post, setPost] = useState<BoardPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  useEffect(() => {
    if (!user || !postId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const route = `${API_ROUTES.BOARD_POSTS}/${postId}`;
        const res = await fetchWithAuth(route, user, { method: "GET" });
        if (cancelled) return;
        if (res.status === 401) {
          setError("인증이 필요합니다. 로그인 후 이용해주세요.");
          return;
        }
        if (res.status === 403) {
          setError("접근 권한이 없습니다.");
          return;
        }
        if (res.status === 404) {
          setError("게시글을 찾을 수 없습니다.");
          return;
        }
        if (!res.ok) {
          setError("게시글을 불러오지 못했습니다.");
          return;
        }
        const data: BoardPost = await res.json();
        setPost(data);
      } catch {
        if (!cancelled) setError("게시글을 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, postId]);

  async function handleDelete() {
    if (!user || !post) return;
    setDeleting(true);
    try {
      const route = `${API_ROUTES.BOARD_POSTS}/${postId}`;
      const res = await fetchWithAuth(route, user, { method: "DELETE" });
      if (res.status === 204) {
        router.push("/board");
        return;
      }
      if (res.status === 403) {
        setError("삭제 권한이 없습니다.");
        return;
      }
      if (res.status === 404) {
        setError("게시글을 찾을 수 없습니다.");
        return;
      }
      setError("삭제하지 못했습니다.");
    } catch {
      setError("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  // ---- Unauthenticated (check before loading finishes) ----
  if (!user && !authLoading) {
    return (
      <PageLayout>
        <div className="max-w-3xl mx-auto px-6 py-20" data-testid="board-detail-login-prompt">
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
  if (authLoading || loading) {
    return (
      <PageLayout>
        <div className="max-w-3xl mx-auto px-6 py-20">
          <p className="text-sm text-zinc-400" data-testid="board-detail-loading">
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
        <div className="max-w-3xl mx-auto px-6 py-20" data-testid="board-detail-login-prompt">
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

  // ---- Error state ----
  if (error || !post) {
    return (
      <PageLayout>
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm mb-4" data-testid="board-detail-error">
            {error ?? "게시글을 찾을 수 없습니다."}
          </div>
          <Link href="/board" className="text-blue-500 hover:underline text-sm">
            목록으로
          </Link>
        </div>
      </PageLayout>
    );
  }

  // ---- Permission check for edit/delete ----
  const isOwner = post.authorId === user.uid;
  const canEditOrDelete = isOwner || admin || boardModerator;

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-4">
          <Link href="/board" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-blue-500 transition-colors">
            ← 목록으로
          </Link>
        </div>

        <article className="bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md rounded-3xl p-8 shadow-xl" data-testid="board-detail">
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                post.category === "notice"
                  ? "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                  : post.category === "qna"
                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
              }`}
            >
              {CATEGORY_LABELS[post.category]}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            {post.title}
          </h1>

          <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400 mb-6 pb-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <span>{post.authorName}</span>
            <span>·</span>
            <span>{new Date(post.createdAt).toLocaleString()}</span>
            {post.updatedAt !== post.createdAt && (
              <>
                <span>·</span>
                <span>수정됨 {new Date(post.updatedAt).toLocaleString()}</span>
              </>
            )}
          </div>

          {/* Body rendered as plain text — no dangerouslySetInnerHTML */}
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap break-words font-sans text-zinc-700 dark:text-zinc-300 text-base leading-relaxed" data-testid="board-detail-body">
              {post.body}
            </pre>
          </div>
        </article>

        {/* Edit/Delete controls — visible only to owner/admin/moderator */}
        {canEditOrDelete && (
          <div className="flex items-center gap-3 mt-6" data-testid="board-detail-actions">
            <Link
              href={`/board/${post.id}/edit`}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              data-testid="board-edit-button"
            >
              수정
            </Link>
            <button
              onClick={() => setDeleteRequested(true)}
              disabled={deleting}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-medium hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="board-delete-button"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        )}
        <ConfirmationDialog
          open={deleteRequested}
          title="게시글을 삭제할까요?"
          description="삭제된 게시글은 복구할 수 없습니다."
          busy={deleting}
          onCancel={() => setDeleteRequested(false)}
          onConfirm={() => void handleDelete().finally(() => setDeleteRequested(false))}
        />
      </div>
    </PageLayout>
  );
}
