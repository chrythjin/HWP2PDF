"use client";

// ---------------------------------------------------------------------------
// JobHistoryList — renders the authenticated user's conversion jobs.
//
// Each row shows jobId, status, createdAt, and either a download link
// (when completed and download not expired) or an "expired" label.
// A delete button with confirmation triggers the onDelete callback.
// ---------------------------------------------------------------------------

import type { JobStatusResponse } from "@hwp2pdf/shared";

interface JobHistoryListProps {
  jobs: JobStatusResponse[];
  onDelete: (jobId: string) => void;
  deletingJobId: string | null;
}

function isDownloadExpired(job: JobStatusResponse): boolean {
  if (!job.downloadExpiresAt) {
    // If no expiry is set, treat as expired when status is not completed.
    return job.status !== "completed";
  }
  return new Date(job.downloadExpiresAt).getTime() <= Date.now();
}

function formatDate(iso?: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const STATUS_LABELS: Record<string, string> = {
  idle: "대기 중",
  uploading: "업로드 중",
  queued: "대기열 대기",
  processing: "변환 중",
  completed: "완료",
  failed: "실패",
  expired: "만료",
  deleted: "삭제됨",
};

export default function JobHistoryList({ jobs, onDelete, deletingJobId }: JobHistoryListProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500 dark:text-zinc-400" data-testid="history-empty">
        변환 이력이 없습니다.
      </div>
    );
  }

  return (
    <ul className="space-y-3" data-testid="history-list">
      {jobs.map((job) => {
        const expired = isDownloadExpired(job);
        const canDownload = job.status === "completed" && !expired;
        const isDeleting = deletingJobId === job.jobId;

        return (
          <li
            key={job.jobId}
            className="bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            data-testid={`history-row-${job.jobId}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300 truncate">
                  {job.jobId}
                </span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  data-testid={`status-badge-${job.jobId}`}
                >
                  {STATUS_LABELS[job.status] ?? job.status}
                </span>
              </div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                {formatDate(job.createdAt)}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {canDownload ? (
                <a
                  href={job.downloadUrl ?? "#"}
                  className="px-4 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm hover:shadow-md transition-shadow"
                  data-testid={`download-link-${job.jobId}`}
                >
                  다운로드
                </a>
              ) : (
                <span
                  className="text-sm text-zinc-400 dark:text-zinc-600"
                  data-testid="download-expired-label"
                >
                  다운로드 만료됨
                </span>
              )}

              <button
                type="button"
                onClick={() => onDelete(job.jobId)}
                disabled={isDeleting}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid={`delete-button-${job.jobId}`}
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}