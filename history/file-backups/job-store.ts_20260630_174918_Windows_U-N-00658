import { Firestore } from "@google-cloud/firestore";
import {
  TOMBSTONE_RETENTION_MS,
  UploadStatus,
  type UploadSession,
} from "@hwp2pdf/shared";
import { config } from "../config.js";

// ---------------------------------------------------------------------------
// JobRecord — owner-aware, retention/tombstone-aware
// ---------------------------------------------------------------------------

export interface JobRecord {
  jobId: string;
  originalFileName: string;
  sourcePath: string;
  originalObjectPath?: string;
  resultPath?: string;
  resultObjectPath?: string;
  status: UploadStatus;
  progress: number;
  message?: string;
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
export type UpdateJobPatch = Partial<Omit<JobRecord, "jobId" | "createdAt">>;

// ---------------------------------------------------------------------------
// UploadSession record (server-side, stored in a sibling collection/map)
// ---------------------------------------------------------------------------

export type UploadSessionRecord = UploadSession;

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

  // --- Owner-aware lookups ---
  getJobForUser(jobId: string, userId: string): Promise<JobRecord | null>;
  getJobForAnonymous(jobId: string, accessTokenHash: string): Promise<JobRecord | null>;
  listJobsByUser(userId: string, options?: ListJobsByUserOptions): Promise<JobRecord[]>;
  markJobDeleted(jobId: string, deletedBy: string): Promise<JobRecord | null>;

  // --- UploadSession CRUD ---
  createUploadSession(session: UploadSessionRecord): Promise<UploadSessionRecord>;
  getUploadSession(jobId: string): Promise<UploadSessionRecord | null>;
  completeUploadSession(jobId: string, updates?: Partial<UploadSessionRecord>): Promise<UploadSessionRecord | null>;
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

    const now = new Date();
    const nowIso = now.toISOString();
    const deletedJob: JobRecord = {
      jobId: current.jobId,
      originalFileName: "[deleted]",
      sourcePath: "[deleted]",
      status: "deleted",
      progress: 0,
      expiresAt: current.expiresAt,
      createdAt: current.createdAt,
      updatedAt: nowIso,
      deletedAt: nowIso,
      deletedBy,
      tombstoneUntil: new Date(now.getTime() + TOMBSTONE_RETENTION_MS).toISOString(),
    };

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

  async expireUploadSessions(before?: Date) {
    const cutoff = before ?? new Date();
    const cutoffMs = cutoff.getTime();
    let removed = 0;

    for (const [jobId, session] of this.uploadSessions) {
      if (Date.parse(session.expiresAt) <= cutoffMs) {
        this.uploadSessions.delete(jobId);
        removed++;
      }
    }

    return removed;
  }
}

// ---------------------------------------------------------------------------
// FirestoreJobStore
// ---------------------------------------------------------------------------

class FirestoreJobStore implements JobStore {
  private readonly firestore = new Firestore({
    projectId: config.firestoreProjectId || undefined,
    databaseId: config.firestoreDatabaseId,
    ignoreUndefinedProperties: true,
  });

  private readonly collection = this.firestore.collection(config.firestoreJobsCollection);
  private readonly sessionsCollection = this.firestore.collection(
    process.env.FIRESTORE_UPLOAD_SESSIONS_COLLECTION ?? "uploadSessions",
  );

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
    const snapshot = await ref.get();
    if (!snapshot.exists) return undefined;

    const current = snapshot.data() as JobRecord;

    // Worker no-op on deleted job: do not resurrect a deleted job.
    if (isDeleted(current)) {
      return current;
    }

    const updated: JobRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await ref.set(updated);
    return updated;
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

    if (!includeDeleted) {
      query = query.where("status", "!=", "deleted");
    }

    query = query.orderBy("createdAt", "desc");

    if (limit !== undefined) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();

    let jobs = snapshot.docs.map((doc) => doc.data() as JobRecord);

    // When includeDeleted=true, filter out purged tombstones in memory.
    if (includeDeleted) {
      jobs = jobs.filter((job) => !isDeleted(job) || !isTombstonePurged(job));
    }

    // Apply offset in memory (Firestore offset() is less efficient).
    if (offset > 0) {
      jobs = jobs.slice(offset);
    }

    return jobs;
  }

  async markJobDeleted(jobId: string, deletedBy: string) {
    const ref = this.collection.doc(jobId);
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;

    const current = snapshot.data() as JobRecord;
    const now = new Date();
    const nowIso = now.toISOString();
    const deletedJob: JobRecord = {
      jobId: current.jobId,
      originalFileName: "[deleted]",
      sourcePath: "[deleted]",
      status: "deleted",
      progress: 0,
      expiresAt: current.expiresAt,
      createdAt: current.createdAt,
      updatedAt: nowIso,
      deletedAt: nowIso,
      deletedBy,
      tombstoneUntil: new Date(now.getTime() + TOMBSTONE_RETENTION_MS).toISOString(),
    };

    await ref.set(deletedJob);
    return deletedJob;
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

  async expireUploadSessions(before?: Date) {
    const cutoff = before ?? new Date();
    const cutoffIso = cutoff.toISOString();

    const snapshot = await this.sessionsCollection
      .where("expiresAt", "<=", cutoffIso)
      .get();

    const batch = this.firestore.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();

    return snapshot.size;
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

export function expireUploadSessions(before?: Date) {
  return selectedStore.expireUploadSessions(before);
}

// Export the selected store instance for testing and advanced use.
export { selectedStore as jobStore };
