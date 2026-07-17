import { FieldPath, Firestore } from "@google-cloud/firestore";
import {
  TOMBSTONE_RETENTION_MS,
  UploadStatus,
  type PublicConversionErrorCode,
  type UploadSession,
} from "@hwp2pdf/shared";
import { config } from "../config.js";

// ---------------------------------------------------------------------------
// JobRecord — owner-aware, retention/tombstone-aware
// ---------------------------------------------------------------------------

export interface JobRecord {
  jobId: string;
  originalFileName: string;
  originalFileSize?: number;
  sourcePath: string;
  originalObjectPath?: string;
  resultPath?: string;
  resultObjectPath?: string;
  status: UploadStatus;
  progress: number;
  message?: string;
  errorCode?: PublicConversionErrorCode;
  downloadUrl?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;

  // --- Owner fields (decision D6/D7/D12) ---
  /** Discriminator: "user" for member jobs, "anonymous" for token-protected jobs. */
  ownerType?: "user" | "anonymous";
  /** Present when ownerType === "user". */
  userId?: string;
  /** SHA-256 hash of the anonymous access token. Present when ownerType === "anonymous". */
  accessTokenHash?: string;

  // --- Retention / TTL fields ---
  /** When the downloadable result file expires. Separate from metadataExpiresAt. */
  downloadExpiresAt?: string;
  /** When the job metadata/history entry expires (member 30-day retention). */
  metadataExpiresAt?: string;

  // --- Tombstone fields (decision D12) ---
  /** ISO timestamp when the member deleted the job. */
  deletedAt?: string;
  /** Who deleted the job (userId or "system"). */
  deletedBy?: string;
  /** Tombstone retention deadline; after this the metadata row may be purged. */
  tombstoneUntil?: string;
}

export type CreateJobInput = Omit<JobRecord, "createdAt" | "updatedAt">;
export type UpdateJobPatch = Partial<
  Omit<JobRecord, "jobId" | "createdAt" | "ownerType" | "userId" | "accessTokenHash">
>;
export type ClaimQueuedJobResult =
  | { status: "claimed"; job: JobRecord }
  | { status: "not_found" }
  | { status: "deleted"; current: JobRecord }
  | { status: "expired"; current: JobRecord }
  | { status: "already_processing"; current: JobRecord }
  | { status: "terminal"; current: JobRecord }
  | { status: "lock_lost"; current: JobRecord };
type ClaimMutationHook = () => void | Promise<void>;
export const JOB_PROCESSING_PROGRESS = 70;
export const JOB_PROCESSING_MESSAGE = "변환 작업을 처리하고 있습니다.";

// ---------------------------------------------------------------------------
// UploadSession record (server-side, stored in a sibling collection/map)
// ---------------------------------------------------------------------------

export type UploadSessionRecord = UploadSession & {
  status?: "active" | "completed" | "expired";
  expiredAt?: string;
  cleanupClaimedAt?: string;
};

export interface MaintenancePageOptions {
  cutoff: Date;
  limit: number;
  cursor?: string;
}

export interface RecoveredJobsPage {
  jobs: JobRecord[];
  nextCursor?: string;
}

export interface ExpiredUploadSessionsPage {
  sessions: UploadSessionRecord[];
  nextCursor?: string;
}

type MaintenanceMutationHook = (jobId: string) => void | Promise<void>;

function maintenanceCursor(timestamp: string, id: string) {
  return Buffer.from(JSON.stringify([1, timestamp, id]), "utf8").toString("base64url");
}

function parseMaintenanceCursor(cursor: string | undefined): [string, string] | null {
  if (!cursor) return null;
  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      !Array.isArray(decoded)
      || decoded.length !== 3
      || decoded[0] !== 1
      || typeof decoded[1] !== "string"
      || typeof decoded[2] !== "string"
    ) {
      throw new Error("Invalid maintenance cursor");
    }
    return [decoded[1], decoded[2]];
  } catch {
    throw new Error("Invalid maintenance cursor");
  }
}

function isAfterMaintenanceCursor(timestamp: string, id: string, cursor: [string, string] | null) {
  return !cursor || timestamp > cursor[0] || (timestamp === cursor[0] && id > cursor[1]);
}

function hasSameUploadCleanupIdentity(current: UploadSessionRecord, candidate: UploadSessionRecord) {
  return current.jobId === candidate.jobId
    && current.objectPath === candidate.objectPath
    && current.ownerType === candidate.ownerType
    && current.userId === candidate.userId
    && current.accessTokenHash === candidate.accessTokenHash
    && current.expiresAt === candidate.expiresAt;
}

function isUploadCleanupEligible(session: UploadSessionRecord) {
  return session.status === "expired" && !session.completedAt && !session.cleanupClaimedAt;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** True when the download deadline (downloadExpiresAt, falling back to expiresAt) has passed. */
export function isDownloadExpired(job: JobRecord): boolean {
  const deadline = job.downloadExpiresAt ?? job.expiresAt;
  return Date.parse(deadline) <= Date.now();
}

/** True when the metadata retention deadline has passed (member 30-day retention). */
export function isMetadataExpired(job: JobRecord): boolean {
  if (!job.metadataExpiresAt) return false;
  return Date.parse(job.metadataExpiresAt) <= Date.now();
}

/** Legacy compatibility: a job is "expired" when its download deadline passes. */
function isExpired(job: JobRecord) {
  return isDownloadExpired(job);
}

function toExpiredJob(job: JobRecord): JobRecord {
  return {
    ...job,
    status: "expired",
    progress: job.progress,
    downloadUrl: undefined,
    message: "다운로드 가능 시간이 만료되었습니다. 파일을 다시 업로드하세요.",
    updatedAt: new Date().toISOString(),
  };
}

/** True when the job is in the deleted/tombstone state. */
function isDeleted(job: JobRecord): boolean {
  return job.status === "deleted" || job.deletedAt !== undefined;
}

/** True when the tombstone retention period has elapsed (safe to purge). */
function isTombstonePurged(job: JobRecord): boolean {
  if (!job.tombstoneUntil) return false;
  return Date.parse(job.tombstoneUntil) <= Date.now();
}

function classifyUnclaimableJob(job: JobRecord): Exclude<ClaimQueuedJobResult, { status: "claimed" } | { status: "not_found" }> | null {
  if (isDeleted(job)) return { status: "deleted", current: job };
  if (job.status === "expired" || isExpired(job)) return { status: "expired", current: job };
  if (job.status === "processing") return { status: "already_processing", current: job };
  if (job.status === "completed" || job.status === "failed") return { status: "terminal", current: job };
  if (job.status !== "queued") return { status: "lock_lost", current: job };
  return null;
}

function toProcessingJob(job: JobRecord): JobRecord {
  return {
    ...job,
    status: "processing",
    progress: JOB_PROCESSING_PROGRESS,
    message: JOB_PROCESSING_MESSAGE,
    updatedAt: new Date().toISOString(),
  };
}

function toDeletedJob(current: JobRecord, deletedBy: string): JobRecord {
  const now = new Date();
  const nowIso = now.toISOString();
  return {
    jobId: current.jobId,
    originalFileName: "[deleted]",
    sourcePath: "[deleted]",
    status: "deleted",
    progress: 0,
    expiresAt: current.expiresAt,
    ...(current.metadataExpiresAt !== undefined ? { metadataExpiresAt: current.metadataExpiresAt } : {}),
    ownerType: current.ownerType,
    userId: current.userId,
    createdAt: current.createdAt,
    updatedAt: nowIso,
    deletedAt: nowIso,
    deletedBy,
    tombstoneUntil: new Date(now.getTime() + TOMBSTONE_RETENTION_MS).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// JobStore interface
// ---------------------------------------------------------------------------

export interface ListJobsByUserOptions {
  /** Include deleted/tombstoned jobs in the result. Default: false. */
  includeDeleted?: boolean;
  /** Maximum number of jobs to return. */
  limit?: number;
  /** Pagination offset. */
  offset?: number;
}

interface JobStore {
  // --- Original CRUD (preserved) ---
  createJob(input: CreateJobInput): Promise<JobRecord>;
  getJob(jobId: string): Promise<JobRecord | undefined>;
  updateJob(jobId: string, patch: UpdateJobPatch): Promise<JobRecord | undefined>;
  claimQueuedJobForProcessing(jobId: string, beforeCommit?: ClaimMutationHook): Promise<ClaimQueuedJobResult>;
  recoverStaleProcessingJobs(
    options: MaintenancePageOptions,
    beforeCommit?: MaintenanceMutationHook,
  ): Promise<RecoveredJobsPage>;

  // --- Owner-aware lookups ---
  getJobForUser(jobId: string, userId: string): Promise<JobRecord | null>;
  getJobForAnonymous(jobId: string, accessTokenHash: string): Promise<JobRecord | null>;
  listJobsByUser(userId: string, options?: ListJobsByUserOptions): Promise<JobRecord[]>;
  markJobDeleted(jobId: string, deletedBy: string): Promise<JobRecord | null>;

  // --- UploadSession CRUD ---
  createUploadSession(session: UploadSessionRecord): Promise<UploadSessionRecord>;
  getUploadSession(jobId: string): Promise<UploadSessionRecord | null>;
  completeUploadSession(jobId: string, updates?: Partial<UploadSessionRecord>): Promise<UploadSessionRecord | null>;
  expireUploadSessionsForCleanup(options: MaintenancePageOptions): Promise<ExpiredUploadSessionsPage>;
  claimExpiredUploadObject(candidate: UploadSessionRecord): Promise<UploadSessionRecord | null>;
  expireUploadSessions(before?: Date): Promise<number>;
}

// ---------------------------------------------------------------------------
// MemoryJobStore
// ---------------------------------------------------------------------------

export class MemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, JobRecord>();
  private readonly uploadSessions = new Map<string, UploadSessionRecord>();

  async createJob(input: CreateJobInput) {
    const now = new Date().toISOString();
    const job: JobRecord = {
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(job.jobId, job);
    return job;
  }

  async getJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;

    // Deleted jobs are not auto-expired; they are tombstones.
    if (isDeleted(job)) return job;

    if (job.status === "expired" || !isExpired(job)) return job;

    const expiredJob = toExpiredJob(job);
    this.jobs.set(jobId, expiredJob);
    return expiredJob;
  }

  async updateJob(jobId: string, patch: UpdateJobPatch) {
    const current = this.jobs.get(jobId);
    if (!current) return undefined;

    // Worker no-op on deleted job: do not resurrect a deleted job.
    if (isDeleted(current)) {
      return current;
    }

    const updated: JobRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, updated);
    return updated;
  }

  async claimQueuedJobForProcessing(jobId: string, beforeCommit?: ClaimMutationHook) {
    const observed = this.jobs.get(jobId);
    if (!observed) return { status: "not_found" } as const;

    const unclaimable = classifyUnclaimableJob(observed);
    if (unclaimable) return unclaimable;

    await beforeCommit?.();

    const current = this.jobs.get(jobId);
    if (!current) return { status: "not_found" } as const;

    if (current.status !== "queued" || isDeleted(current) || isExpired(current)) {
      return { status: "lock_lost", current } as const;
    }

    const claimed = toProcessingJob(current);
    this.jobs.set(jobId, claimed);
    return { status: "claimed", job: claimed } as const;
  }

  async recoverStaleProcessingJobs(options: MaintenancePageOptions, beforeCommit?: MaintenanceMutationHook) {
    const cutoffIso = options.cutoff.toISOString();
    const cursor = parseMaintenanceCursor(options.cursor);
    const candidates = Array.from(this.jobs.values())
      .filter((job) => job.status === "processing" && job.updatedAt < cutoffIso)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.jobId.localeCompare(b.jobId))
      .filter((job) => isAfterMaintenanceCursor(job.updatedAt, job.jobId, cursor))
      .slice(0, Math.max(0, options.limit));
    const jobs: JobRecord[] = [];
    for (const candidate of candidates) {
      await beforeCommit?.(candidate.jobId);
      const current = this.jobs.get(candidate.jobId);
      if (!current || current.status !== "processing" || current.updatedAt !== candidate.updatedAt || current.updatedAt >= cutoffIso) continue;
      const recovered = { ...current, status: "queued" as const, progress: 60, message: "대기 중인 작업이 재시도 대기열에 재등록되었습니다.", updatedAt: new Date().toISOString() };
      this.jobs.set(candidate.jobId, recovered);
      jobs.push(recovered);
    }
    const last = candidates.at(-1);
    return { jobs, nextCursor: candidates.length === options.limit && last ? maintenanceCursor(last.updatedAt, last.jobId) : undefined };
  }

  async getJobForUser(jobId: string, userId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    if (isDeleted(job)) return null;
    if (job.ownerType !== "user" || job.userId !== userId) return null;

    // Auto-expire download if needed.
    if (job.status !== "expired" && isExpired(job)) {
      const expiredJob = toExpiredJob(job);
      this.jobs.set(jobId, expiredJob);
      return expiredJob;
    }

    return job;
  }

  async getJobForAnonymous(jobId: string, accessTokenHash: string) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    if (isDeleted(job)) return null;
    if (job.ownerType !== "anonymous" || job.accessTokenHash !== accessTokenHash) return null;

    // Auto-expire download if needed.
    if (job.status !== "expired" && isExpired(job)) {
      const expiredJob = toExpiredJob(job);
      this.jobs.set(jobId, expiredJob);
      return expiredJob;
    }

    return job;
  }

  async listJobsByUser(userId: string, options: ListJobsByUserOptions = {}) {
    const { includeDeleted = false, limit, offset = 0 } = options;

    const jobs = Array.from(this.jobs.values()).filter((job) => {
      if (job.ownerType !== "user" || job.userId !== userId) return false;
      if (isDeleted(job)) {
        if (!includeDeleted) return false;
        // Even with includeDeleted, exclude purged tombstones.
        if (isTombstonePurged(job)) return false;
        return true;
      }
      return true;
    });

    // Sort by createdAt descending (newest first).
    jobs.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    const start = offset;
    const end = limit !== undefined ? start + limit : undefined;
    return jobs.slice(start, end);
  }

  async markJobDeleted(jobId: string, deletedBy: string) {
    const current = this.jobs.get(jobId);
    if (!current) return null;
    if (isDeleted(current)) return current;
    if (deletedBy !== "system" && (current.ownerType !== "user" || current.userId !== deletedBy)) return null;
    if (current.status === "processing") return null;

    const deletedJob = toDeletedJob(current, deletedBy);

    this.jobs.set(jobId, deletedJob);
    return deletedJob;
  }

  // --- UploadSession CRUD ---

  async createUploadSession(session: UploadSessionRecord) {
    this.uploadSessions.set(session.jobId, session);
    return session;
  }

  async getUploadSession(jobId: string) {
    const session = this.uploadSessions.get(jobId);
    return session ?? null;
  }

  async completeUploadSession(jobId: string, updates?: Partial<UploadSessionRecord>) {
    const current = this.uploadSessions.get(jobId);
    if (!current) return null;

    const completed: UploadSessionRecord = {
      ...current,
      ...updates,
      completedAt: new Date().toISOString(),
    };

    this.uploadSessions.set(jobId, completed);
    return completed;
  }

  async expireUploadSessionsForCleanup(options: MaintenancePageOptions) {
    const cursor = parseMaintenanceCursor(options.cursor);
    const candidates = Array.from(this.uploadSessions.values())
      .filter((item) => !item.completedAt && item.status !== "completed" && !item.cleanupClaimedAt && Date.parse(item.expiresAt) <= options.cutoff.getTime())
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.jobId.localeCompare(b.jobId))
      .filter((item) => isAfterMaintenanceCursor(item.expiresAt, item.jobId, cursor))
      .slice(0, Math.max(0, options.limit));
    const sessions = candidates.map((item) => item.status === "expired"
      ? item
      : { ...item, status: "expired" as const, expiredAt: options.cutoff.toISOString() });
    for (const item of sessions) this.uploadSessions.set(item.jobId, item);
    const last = candidates.at(-1);
    return { sessions, nextCursor: candidates.length === options.limit && last ? maintenanceCursor(last.expiresAt, last.jobId) : undefined };
  }

  async claimExpiredUploadObject(candidate: UploadSessionRecord) {
    const current = this.uploadSessions.get(candidate.jobId);
    if (!current || !isUploadCleanupEligible(current)) return null;
    if (!hasSameUploadCleanupIdentity(current, candidate)) return null;
    const claimed = { ...current, cleanupClaimedAt: new Date().toISOString() };
    this.uploadSessions.set(current.jobId, claimed);
    return claimed;
  }

  async expireUploadSessions(before = new Date()) {
    const result = await this.expireUploadSessionsForCleanup({ cutoff: before, limit: 100 });
    return result.sessions.length;
  }
}

// ---------------------------------------------------------------------------
// FirestoreJobStore
// ---------------------------------------------------------------------------

export class FirestoreJobStore implements JobStore {
  private readonly firestore: Firestore;

  private readonly collection;
  private readonly sessionsCollection;

  constructor(firestore?: Firestore) {
    this.firestore = firestore ?? new Firestore({
      projectId: config.firestoreProjectId || undefined,
      databaseId: config.firestoreDatabaseId,
      ignoreUndefinedProperties: true,
    });
    this.collection = this.firestore.collection(config.firestoreJobsCollection);
    this.sessionsCollection = this.firestore.collection(
      process.env.FIRESTORE_UPLOAD_SESSIONS_COLLECTION ?? "uploadSessions",
    );
  }

  async createJob(input: CreateJobInput) {
    const now = new Date().toISOString();
    const job: JobRecord = {
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.doc(job.jobId).set(job);
    return job;
  }

  async getJob(jobId: string) {
    const ref = this.collection.doc(jobId);
    const snapshot = await ref.get();
    if (!snapshot.exists) return undefined;

    const job = snapshot.data() as JobRecord;

    // Deleted jobs are not auto-expired; they are tombstones.
    if (isDeleted(job)) return job;

    if (job.status === "expired" || !isExpired(job)) return job;

    const expiredJob = toExpiredJob(job);
    await ref.set(expiredJob);
    return expiredJob;
  }

  async updateJob(jobId: string, patch: UpdateJobPatch) {
    const ref = this.collection.doc(jobId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return undefined;

      const current = snapshot.data() as JobRecord;
      if (isDeleted(current)) return current;

      const updated: JobRecord = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      transaction.set(ref, updated);
      return updated;
    });
  }

  async claimQueuedJobForProcessing(jobId: string, beforeCommit?: ClaimMutationHook) {
    const ref = this.collection.doc(jobId);

    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return { status: "not_found" } as const;

      const current = snapshot.data() as JobRecord;
      const unclaimable = classifyUnclaimableJob(current);
      if (unclaimable) return unclaimable;

      await beforeCommit?.();

      const claimed = toProcessingJob(current);
      transaction.set(ref, claimed);
      return { status: "claimed", job: claimed } as const;
    });
  }

  async recoverStaleProcessingJobs(options: MaintenancePageOptions, beforeCommit?: MaintenanceMutationHook) {
    let query: FirebaseFirestore.Query = this.collection
      .where("status", "==", "processing")
      .where("updatedAt", "<", options.cutoff.toISOString())
      .orderBy("updatedAt", "asc")
      .orderBy(FieldPath.documentId(), "asc");
    const cursor = parseMaintenanceCursor(options.cursor);
    if (cursor) query = query.startAfter(...cursor);
    const snapshot = await query.limit(Math.max(0, options.limit)).get();
    const jobs: JobRecord[] = [];
    for (const doc of snapshot.docs) {
      await beforeCommit?.(doc.id);
      const recovered = await this.firestore.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(doc.ref);
        if (!currentSnapshot.exists) return null;
        const current = currentSnapshot.data() as JobRecord;
        const scanned = doc.data() as JobRecord;
        if (current.status !== "processing" || current.updatedAt !== scanned.updatedAt || current.updatedAt >= options.cutoff.toISOString()) return null;
        const value = { ...current, status: "queued" as const, progress: 60, message: "대기 중인 작업이 재시도 대기열에 재등록되었습니다.", updatedAt: new Date().toISOString() };
        transaction.set(doc.ref, value);
        return value;
      });
      if (recovered) jobs.push(recovered);
    }
    const last = snapshot.docs.at(-1);
    const lastJob = last?.data() as JobRecord | undefined;
    return { jobs, nextCursor: snapshot.size === options.limit && last && lastJob ? maintenanceCursor(lastJob.updatedAt, last.id) : undefined };
  }

  async getJobForUser(jobId: string, userId: string) {
    const ref = this.collection.doc(jobId);
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;

    const job = snapshot.data() as JobRecord;
    if (isDeleted(job)) return null;
    if (job.ownerType !== "user" || job.userId !== userId) return null;

    if (job.status !== "expired" && isExpired(job)) {
      const expiredJob = toExpiredJob(job);
      await ref.set(expiredJob);
      return expiredJob;
    }

    return job;
  }

  async getJobForAnonymous(jobId: string, accessTokenHash: string) {
    const ref = this.collection.doc(jobId);
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;

    const job = snapshot.data() as JobRecord;
    if (isDeleted(job)) return null;
    if (job.ownerType !== "anonymous" || job.accessTokenHash !== accessTokenHash) return null;

    if (job.status !== "expired" && isExpired(job)) {
      const expiredJob = toExpiredJob(job);
      await ref.set(expiredJob);
      return expiredJob;
    }

    return job;
  }

  async listJobsByUser(userId: string, options: ListJobsByUserOptions = {}) {
    const { includeDeleted = false, limit, offset = 0 } = options;

    // Query user's non-deleted jobs by default.
    let query: FirebaseFirestore.Query = this.collection
      .where("ownerType", "==", "user")
      .where("userId", "==", userId);

    query = query.orderBy("createdAt", "desc");

    const snapshot = await query.get();

    let jobs = snapshot.docs.map((doc) => doc.data() as JobRecord);

    jobs = includeDeleted
      ? jobs.filter((job) => !isDeleted(job) || !isTombstonePurged(job))
      : jobs.filter((job) => !isDeleted(job));

    // Apply offset in memory (Firestore offset() is less efficient).
    if (offset > 0) {
      jobs = jobs.slice(offset);
    }

    if (limit !== undefined) {
      jobs = jobs.slice(0, limit);
    }

    return jobs;
  }

  async markJobDeleted(jobId: string, deletedBy: string) {
    const ref = this.collection.doc(jobId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return null;

      const current = snapshot.data() as JobRecord;
      if (isDeleted(current)) return current;
      if (deletedBy !== "system" && (current.ownerType !== "user" || current.userId !== deletedBy)) return null;
      if (current.status === "processing") return null;

      const deletedJob = toDeletedJob(current, deletedBy);
      transaction.set(ref, deletedJob);
      return deletedJob;
    });
  }

  // --- UploadSession CRUD ---

  async createUploadSession(session: UploadSessionRecord) {
    await this.sessionsCollection.doc(session.jobId).set(session);
    return session;
  }

  async getUploadSession(jobId: string) {
    const snapshot = await this.sessionsCollection.doc(jobId).get();
    if (!snapshot.exists) return null;
    return snapshot.data() as UploadSessionRecord;
  }

  async completeUploadSession(jobId: string, updates?: Partial<UploadSessionRecord>) {
    const ref = this.sessionsCollection.doc(jobId);
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;

    const current = snapshot.data() as UploadSessionRecord;
    const completed: UploadSessionRecord = {
      ...current,
      ...updates,
      completedAt: new Date().toISOString(),
    };

    await ref.set(completed);
    return completed;
  }

  async expireUploadSessionsForCleanup(options: MaintenancePageOptions) {
    let query: FirebaseFirestore.Query = this.sessionsCollection
      .where("expiresAt", "<=", options.cutoff.toISOString())
      .orderBy("expiresAt", "asc")
      .orderBy(FieldPath.documentId(), "asc");
    const cursor = parseMaintenanceCursor(options.cursor);
    if (cursor) query = query.startAfter(...cursor);
    const snapshot = await query.limit(Math.max(0, options.limit)).get();
    const sessions: UploadSessionRecord[] = [];
    for (const doc of snapshot.docs) {
      const expired = await this.firestore.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(doc.ref);
        if (!currentSnapshot.exists) return null;
        const current = currentSnapshot.data() as UploadSessionRecord;
        const scanned = doc.data() as UploadSessionRecord;
        if (
          current.completedAt
          || current.status === "completed"
          || current.cleanupClaimedAt
          || Date.parse(current.expiresAt) > options.cutoff.getTime()
          || !hasSameUploadCleanupIdentity(current, scanned)
        ) return null;
        if (current.status === "expired") return current;
        const value = { ...current, status: "expired" as const, expiredAt: options.cutoff.toISOString() };
        transaction.set(doc.ref, value);
        return value;
      });
      if (expired) sessions.push(expired);
    }
    const last = snapshot.docs.at(-1);
    const lastSession = last?.data() as UploadSessionRecord | undefined;
    return { sessions, nextCursor: snapshot.size === options.limit && last && lastSession ? maintenanceCursor(lastSession.expiresAt, last.id) : undefined };
  }

  async claimExpiredUploadObject(candidate: UploadSessionRecord) {
    const ref = this.sessionsCollection.doc(candidate.jobId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return null;
      const current = snapshot.data() as UploadSessionRecord;
      if (!isUploadCleanupEligible(current)) return null;
      if (!hasSameUploadCleanupIdentity(current, candidate)) return null;
      const claimed = { ...current, cleanupClaimedAt: new Date().toISOString() };
      transaction.set(ref, claimed);
      return claimed;
    });
  }

  async expireUploadSessions(before = new Date()) {
    const result = await this.expireUploadSessionsForCleanup({ cutoff: before, limit: 100 });
    return result.sessions.length;
  }
}

// ---------------------------------------------------------------------------
// Store selection + exported functions
// ---------------------------------------------------------------------------

const selectedStore: JobStore = config.jobStoreBackend === "firestore" ? new FirestoreJobStore() : new MemoryJobStore();

export function createJob(input: CreateJobInput) {
  return selectedStore.createJob(input);
}

export function getJob(jobId: string) {
  return selectedStore.getJob(jobId);
}

export function updateJob(jobId: string, patch: UpdateJobPatch) {
  return selectedStore.updateJob(jobId, patch);
}

export function claimQueuedJobForProcessing(jobId: string, beforeCommit?: ClaimMutationHook) {
  return selectedStore.claimQueuedJobForProcessing(jobId, beforeCommit);
}

export function getJobForUser(jobId: string, userId: string) {
  return selectedStore.getJobForUser(jobId, userId);
}

export function getJobForAnonymous(jobId: string, accessTokenHash: string) {
  return selectedStore.getJobForAnonymous(jobId, accessTokenHash);
}

export function listJobsByUser(userId: string, options?: ListJobsByUserOptions) {
  return selectedStore.listJobsByUser(userId, options);
}

export function markJobDeleted(jobId: string, deletedBy: string) {
  return selectedStore.markJobDeleted(jobId, deletedBy);
}

export function createUploadSession(session: UploadSessionRecord) {
  return selectedStore.createUploadSession(session);
}

export function getUploadSession(jobId: string) {
  return selectedStore.getUploadSession(jobId);
}

export function completeUploadSession(jobId: string, updates?: Partial<UploadSessionRecord>) {
  return selectedStore.completeUploadSession(jobId, updates);
}

export function expireUploadSessionsForCleanup(options: MaintenancePageOptions) {
  return selectedStore.expireUploadSessionsForCleanup(options);
}

export function recoverStaleProcessingJobs(options: MaintenancePageOptions) {
  return selectedStore.recoverStaleProcessingJobs(options);
}

export function claimExpiredUploadObject(candidate: UploadSessionRecord) {
  return selectedStore.claimExpiredUploadObject(candidate);
}

export function expireUploadSessions(before?: Date) {
  return selectedStore.expireUploadSessions(before);
}

// Export the selected store instance for testing and advanced use.
export { selectedStore as jobStore };
