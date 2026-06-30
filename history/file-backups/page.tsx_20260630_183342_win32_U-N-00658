"use client";

// ---------------------------------------------------------------------------
// History page — authenticated member conversion history.
//
// Requires login: if not logged in, shows a login CTA linking to /login.
// Fetches /v1/me/jobs on mount and when user changes.
// Distinguishes active download vs expired download.
// Delete with confirmation; removes row from local state on success.
// Handles 401/403 by showing an auth-error message with a login link.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import JobHistoryList from "@/components/JobHistoryList";
import { useAuth } from "@/auth/useAuth";
import { fetchWithAuth } from "@/lib/api-client";
import { API_ROUTES, type JobStatusResponse } from "@hwp2pdf/shared";

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const [jobs, setJobs] = useState<JobStatusResponse[]>([]);
  const [fetching, setFetching] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    setAuthError(false);
    try {
      const res = await fetchWithAuth(API_ROUTES.ME_JOBS, user, { method: "GET" });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        setJobs([]);
        return;
      }
      if (!res.ok) {
        setJobs([]);
        return;
      }
      const data = (await res.json()) as JobStatusResponse[];
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setJobs([]);
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadJobs();
    });
  }, [loadJobs]);

  const handleDelete = useCallback(
    async (jobId: string) => {
      if (!user) return;
      const confirmed = window.confirm("이 변환 이력을 삭제하시겠습니까? 삭제된 파일은 복구할 수 없습니다.");
      if (!confirmed) return;

      setDeletingJobId(jobId);
      try {
        const route = `${API_ROUTES.ME_JOBS}/${jobId}`;
        const res = await fetchWithAuth(route, user, { method: "DELETE" });

        if (res.status === 401 || res.status === 403) {
          setAuthError(true);
          return;
        }
        if (!res.ok) return;

        // Remove the deleted row from local state.
        setJobs((prev) => prev.filter((j) => j.jobId !== jobId));
      } finally {
        setDeletingJobId(null);
      }
    },
    [user],
  );

  // ---- Loading state (auth still resolving) ----
  if (loading) {
    return (
      <PageLayout showBackground={true}>
        <div className="max-w-3xl mx-auto px-6 py-20">
          <p className="text-zinc-500 dark:text-zinc-400">로딩 중...</p>
        </div>
      </PageLayout>
    );
  }

  // ---- Unauthenticated state: login prompt ----
  if (!user) {
    return (
      <PageLayout showBackground={true}>
        <div className="max-w-md mx-auto px-6 py-20" data-testid="history-login-prompt">
          <div className="bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md rounded-3xl p-8 shadow-xl text-center">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              로그인 필요
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              변환 이력을 확인하려면 로그인하세요.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-blue-500/20 transition-all"
            >
              로그인
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  // ---- Auth error state (401/403 from API) ----
  if (authError) {
    return (
      <PageLayout showBackground={true}>
        <div className="max-w-md mx-auto px-6 py-20" data-testid="history-auth-error">
          <div className="bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md rounded-3xl p-8 shadow-xl text-center">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              인증이 만료되었습니다
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              다시 로그인 후 이용해 주세요.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-blue-500/20 transition-all"
            >
              로그인하기
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  // ---- Authenticated: job history list ----
  return (
    <PageLayout showBackground={true}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            변환 이력
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            회원 계정의 변환 이력을 관리하세요. 다운로드는 완료 후 일정 시간 동안만 가능합니다.
          </p>
        </div>

        {fetching ? (
          <div className="text-center py-16 text-zinc-500 dark:text-zinc-400" data-testid="history-loading">
            불러오는 중...
          </div>
        ) : (
          <JobHistoryList jobs={jobs} onDelete={handleDelete} deletingJobId={deletingJobId} />
        )}
      </div>
    </PageLayout>
  );
}