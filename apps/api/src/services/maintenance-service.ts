import { enqueueConversionJob } from "./cloud-tasks-dispatcher.js";
import {
  claimExpiredUploadObject,
  type CleanupDiagnostics,
  expireUploadSessionsForCleanup,
  recoverStaleProcessingJobs,
} from "./job-store.js";
import { deleteExactStoredObject } from "./storage-service.js";

export interface MaintenanceSummary {
  attempted: number;
  recovered: number;
  skipped: number;
  failed: number;
  hasMore: boolean;
  cleanupDiagnostics: CleanupDiagnostics & { claimed: number };
}

const MAX_CLEANUP_SCAN_PAGES = 10;

function emptyCleanupDiagnostics(): CleanupDiagnostics {
  return {
    completedOrStatus: 0,
    alreadyClaimed: 0,
    invalidExpiry: 0,
    expiryAfterCutoff: 0,
    identityMismatch: 0,
    accepted: 0,
  };
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function collectCleanupSessions(cutoff: Date, limit: number) {
  const sessions: Awaited<ReturnType<typeof expireUploadSessionsForCleanup>>["sessions"] = [];
  const cleanupDiagnostics = emptyCleanupDiagnostics();
  let cursor: string | undefined;
  let hasMore = false;

  for (let pageNumber = 0; pageNumber < MAX_CLEANUP_SCAN_PAGES && sessions.length < limit; pageNumber += 1) {
    const page = await expireUploadSessionsForCleanup({
      cutoff,
      limit: limit - sessions.length,
      ...(cursor ? { cursor } : {}),
    });
    sessions.push(...page.sessions);
    const pageDiagnostics = page.cleanupDiagnostics ?? emptyCleanupDiagnostics();
    for (const key of Object.keys(cleanupDiagnostics) as Array<keyof CleanupDiagnostics>) {
      cleanupDiagnostics[key] += pageDiagnostics[key];
    }
    cursor = page.nextCursor;
    hasMore = Boolean(cursor);
    if (!cursor) break;
  }

  return { sessions, hasMore, cleanupDiagnostics };
}

export async function runMaintenance(now = new Date()): Promise<MaintenanceSummary> {
  const limit = positiveInteger(process.env.MAINTENANCE_BATCH_LIMIT, 100);
  const staleMinutes = positiveInteger(process.env.STUCK_JOB_THRESHOLD_MINUTES, 10);
  const [recoveryPage, cleanupPage] = await Promise.all([
    recoverStaleProcessingJobs({
      cutoff: new Date(now.getTime() - staleMinutes * 60_000),
      limit,
    }),
    collectCleanupSessions(now, limit),
  ]);

  let enqueued = 0;
  let recoveryFailed = 0;
  for (const job of recoveryPage.jobs) {
    try {
      await enqueueConversionJob(job.jobId);
      enqueued += 1;
    } catch {
      recoveryFailed += 1;
    }
  }

  let cleanupClaimed = 0;
  let deleted = 0;
  let cleanupFailed = 0;
  for (const session of cleanupPage.sessions) {
    try {
      const claim = await claimExpiredUploadObject(session);
      if (!claim) continue;
      cleanupClaimed += 1;
      await deleteExactStoredObject(claim.objectPath);
      deleted += 1;
    } catch {
      cleanupFailed += 1;
    }
  }

  return {
    attempted: recoveryPage.jobs.length + cleanupPage.sessions.length,
    recovered: enqueued + deleted,
    skipped: cleanupPage.sessions.length - cleanupClaimed,
    failed: recoveryFailed + cleanupFailed,
    hasMore: Boolean(recoveryPage.nextCursor || cleanupPage.hasMore),
    cleanupDiagnostics: { ...cleanupPage.cleanupDiagnostics, claimed: cleanupClaimed },
  };
}
