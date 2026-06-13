import { Firestore } from "@google-cloud/firestore";
import { UploadStatus } from "@hwp2pdf/shared";
import { config } from "../config.js";

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
}

export type CreateJobInput = Omit<JobRecord, "createdAt" | "updatedAt">;
export type UpdateJobPatch = Partial<Omit<JobRecord, "jobId" | "createdAt">>;

function isExpired(job: JobRecord) {
  return Date.parse(job.expiresAt) <= Date.now();
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

interface JobStore {
  createJob(input: CreateJobInput): Promise<JobRecord>;
  getJob(jobId: string): Promise<JobRecord | undefined>;
  updateJob(jobId: string, patch: UpdateJobPatch): Promise<JobRecord | undefined>;
}

class MemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, JobRecord>();

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
    if (job.status === "expired" || !isExpired(job)) return job;

    const expiredJob = toExpiredJob(job);
    this.jobs.set(jobId, expiredJob);
    return expiredJob;
  }

  async updateJob(jobId: string, patch: UpdateJobPatch) {
    const current = this.jobs.get(jobId);
    if (!current) return undefined;

    const updated: JobRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, updated);
    return updated;
  }
}

class FirestoreJobStore implements JobStore {
  private readonly firestore = new Firestore({
    projectId: config.firestoreProjectId || undefined,
    databaseId: config.firestoreDatabaseId,
  });

  private readonly collection = this.firestore.collection(config.firestoreJobsCollection);

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
    const updated: JobRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await ref.set(updated);
    return updated;
  }
}

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
