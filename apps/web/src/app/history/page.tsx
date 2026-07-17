"use client";

// ---------------------------------------------------------------------------
// History page — authenticated member conversion history.
//
// Requires login: if not logged in, shows a login CTA linking to /login.
// Fetches /v1/me/jobs on mount and when user changes.
//
// Request state is discriminated into:
//   - loading  : initial fetch in progress (no data yet)
//   - success  : fetch succeeded with data (may be empty)
//   - empty    : fetch succeeded with zero items
//   - error    : fetch failed and no stale data to show
//   - stale    : fetch failed but previous data is still visible + warning
//
// 401/403 are kept visually distinct from empty/error via the auth-error
// state. API failures are NEVER converted to []; the error path shows a
// retry button. On refresh failure with existing data, the stale list
// stays visible with a non-empty warning and retry control.
//
// Downloads use the T2 authenticated download helper (fetch + Blob) so the
// Firebase bearer token stays in the Authorization header, never in the URL.
// Delete with confirmation; removes row from local state on success.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import JobHistoryList from "@/components/JobHistoryList";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useAuth } from "@/auth/useAuth";
import {
  ApiClientError,
  fetchJsonWithAuth,
  fetchWithAuth,
  type ApiPageState,
} from "@/lib/api-client";
import { downloadProtectedFile } from "@/lib/download-file";
import {
  API_ROUTES,
  DOWNLOAD_UNAVAILABLE_REASONS,
  PUBLIC_CONVERSION_ERROR_CODES,
  type JobStatusResponse,
} from "@hwp2pdf/shared";

const JOB_STATUSES = new Set([
  "idle",
  "uploading",
  "queued",
  "processing",
  "completed",
  "failed",
  "expired",
  "deleted",
]);
const PUBLIC_ERROR_CODES = new Set<string>(PUBLIC_CONVERSION_ERROR_CODES);
const DOWNLOAD_UNAVAILABLE_REASON_VALUES = new Set<string>(DOWNLOAD_UNAVAILABLE_REASONS);

function hasOptionalString(value: object, key: string): boolean {
  return !(key in value) || typeof Reflect.get(value, key) === "string";
}

function isJobStatusResponse(value: unknown): value is JobStatusResponse {
  if (typeof value !== "object" || value === null) return false;
  if (!("jobId" in value) || typeof value.jobId !== "string") return false;
  if (!("status" in value) || typeof value.status !== "string" || !JOB_STATUSES.has(value.status)) {
    return false;
  }

  const stringsAreValid = [
    "originalFileName",
    "message",
    "downloadUrl",
    "createdAt",
    "updatedAt",
    "expiresAt",
    "downloadExpiresAt",
    "metadataExpiresAt",
    "deletedAt",
    "deletedBy",
    "tombstoneUntil",
  ].every((key) => hasOptionalString(value, key));
  if (!stringsAreValid) return false;

  if ("progress" in value && typeof value.progress !== "number") return false;
  if (
    "errorCode" in value &&
    (typeof value.errorCode !== "string" || !PUBLIC_ERROR_CODES.has(value.errorCode))
  ) {
    return false;
  }

  if (!("downloadAvailable" in value)) {
    return !("downloadUnavailableReason" in value);
  }
  if (value.downloadAvailable === true) {
    return !("downloadUnavailableReason" in value);
  }
  if (value.downloadAvailable === false) {
    return (
      "downloadUnavailableReason" in value &&
      typeof value.downloadUnavailableReason === "string" &&
      DOWNLOAD_UNAVAILABLE_REASON_VALUES.has(value.downloadUnavailableReason)
    );
  }
  return false;
}

function isJobHistoryResponse(value: unknown): value is JobStatusResponse[] {
  return Array.isArray(value) && value.every(isJobStatusResponse);
}

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const [jobs, setJobs] = useState<JobStatusResponse[]>([]);
  const [fetchState, setFetchState] = useState<ApiPageState>("idle");
  const [authError, setAuthError] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ jobId: string; message: string } | null>(null);
  const [pendingDeleteJobId, setPendingDeleteJobId] = useState<string | null>(null);

  // Track whether we have existing data without adding jobs.length to
  // loadJobs' dependency array. This prevents a delete-induced jobs change
  // from re-triggering the initial-load effect.
  const hasDataRef = useRef(false);

  useEffect(() => {
    hasDataRef.current = jobs.length > 0;
  }, [jobs.length]);

  const loadJobs = useCallback(async () => {
    if (!user) return;
    // Only show loading spinner on initial fetch (no existing data).
    // On refresh with existing data, keep the data visible.
    if (!hasDataRef.current) {
      setFetchState("loading");
    }
    setAuthError(false);
    try {
      const data = await fetchJsonWithAuth(
        API_ROUTES.ME_JOBS,
        user,
        isJobHistoryResponse,
        { method: "GET" },
      );
      setJobs(data);
      setFetchState(data.length === 0 ? "empty" : "success");
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        (error.code === "unauthorized" || error.code === "forbidden")
      ) {
        setAuthError(true);
        setJobs([]);
        setFetchState("error");
        return;
      }
      // Network error — do NOT convert to []. Keep existing data if available.
      if (hasDataRef.current) {
        setFetchState("stale");
      } else {
        setFetchState("error");
      }
    }
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadJobs();
    });
  }, [loadJobs]);

  const handleDownload = useCallback(
    async (job: JobStatusResponse) => {
      if (!user || !job.downloadUrl) return;

      setDownloadingJobId(job.jobId);
      setDownloadError(null);
      try {
        await downloadProtectedFile({
          url: job.downloadUrl,
          user,
          filename: `${job.jobId}.pdf`,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "PDF 다운로드에 실패했습니다.";
        setDownloadError({ jobId: job.jobId, message });
      } finally {
        setDownloadingJobId(null);
      }
    },
    [user],
  );

  const handleDelete = useCallback(
    async (jobId: string) => {
      if (!user) return;
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

  const requestDelete = useCallback((jobId: string) => setPendingDeleteJobId(jobId), []);

  // ---- Loading state (auth still resolving) ----
  if (loading) {
    return (
      <PageLayout showBackground={true}>
          <div className="max-w-3xl mx-auto px-6 py-20" aria-busy="true">
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              변환 이력
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              회원 계정의 변환 이력을 관리하세요. 다운로드는 완료 후 일정 시간 동안만 가능합니다.
            </p>
          </div>
          {/* Refresh button — always available when authenticated */}
          <button
            type="button"
            onClick={() => void loadJobs()}
            disabled={fetchState === "loading"}
            className="px-4 py-2 text-sm font-medium rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="history-refresh-button"
          >
            {fetchState === "loading" ? "불러오는 중..." : "새로고침"}
          </button>
        </div>

        {/* Stale warning — keep old data visible with a non-empty warning */}
        {fetchState === "stale" && (
          <div
            className="mb-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm flex items-center justify-between gap-4"
            data-testid="history-stale-warning"
            role="alert"
          >
            <span>
              이력을 새로고침하지 못했습니다. 아래 데이터는 마지막으로 불러온 목록입니다.
            </span>
            <button
              type="button"
              onClick={() => void loadJobs()}
              className="px-3 py-1.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors shrink-0"
              data-testid="history-retry-stale-button"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Error state — no data to show, retry button */}
        {fetchState === "error" && (
          <div
            className="text-center py-16"
            data-testid="history-error"
          >
            <div className="inline-flex p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-4">
              이력을 불러오지 못했습니다.
            </p>
            <button
              type="button"
              onClick={() => void loadJobs()}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-blue-500/20 transition-all"
              data-testid="history-retry-button"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Loading state — initial fetch only */}
        {fetchState === "loading" && (
          <div className="text-center py-16 text-zinc-500 dark:text-zinc-400" aria-busy="true" data-testid="history-loading">
            불러오는 중...
          </div>
        )}

        {/* Success or stale — show the list (may be empty) */}
        {(fetchState === "success" || fetchState === "empty" || fetchState === "stale") && (
          <JobHistoryList
            jobs={jobs}
            onDelete={requestDelete}
            deletingJobId={deletingJobId}
            onDownload={handleDownload}
            downloadingJobId={downloadingJobId}
            downloadError={downloadError}
          />
        )}
        <ConfirmationDialog
          open={pendingDeleteJobId !== null}
          title="변환 이력을 삭제할까요?"
          description="삭제된 파일은 복구할 수 없습니다."
          busy={deletingJobId !== null}
          onCancel={() => setPendingDeleteJobId(null)}
          onConfirm={() => {
            if (!pendingDeleteJobId) return;
            void handleDelete(pendingDeleteJobId).finally(() => setPendingDeleteJobId(null));
          }}
        />
      </div>
    </PageLayout>
  );
}
