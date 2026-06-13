import { UploadStatus } from "@hwp2pdf/shared";

export interface JobRecord {
  jobId: string;
  originalFileName: string;
  sourcePath: string;
  resultPath?: string;
  status: UploadStatus;
  progress: number;
  message?: string;
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const jobs = new Map<string, JobRecord>();

export function createJob(input: Omit<JobRecord, "createdAt" | "updatedAt">): JobRecord {
  const now = new Date().toISOString();
  const job: JobRecord = {
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  jobs.set(job.jobId, job);
  return job;
}

export function getJob(jobId: string): JobRecord | undefined {
  return jobs.get(jobId);
}

export function updateJob(jobId: string, patch: Partial<Omit<JobRecord, "jobId" | "createdAt">>): JobRecord | undefined {
  const current = jobs.get(jobId);
  if (!current) return undefined;

  const updated: JobRecord = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  jobs.set(jobId, updated);
  return updated;
}
