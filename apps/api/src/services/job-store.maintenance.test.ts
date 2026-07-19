import { afterEach, describe, expect, it, vi } from "vitest";
import { FirestoreJobStore, MemoryJobStore, type JobRecord, type UploadSessionRecord } from "./job-store.js";

const iso = (value: number) => new Date(value).toISOString();

afterEach(() => vi.useRealTimers());

function processingJob(jobId: string, updatedAt: string, status: JobRecord["status"] = "processing"): JobRecord {
  return {
    jobId,
    originalFileName: `${jobId}.hwp`,
    sourcePath: `tmp/${jobId}.hwp`,
    status,
    progress: 70,
    expiresAt: iso(Date.now() + 60_000),
    createdAt: updatedAt,
    updatedAt,
    ownerType: "user",
    userId: "owner-1",
  };
}

function session(jobId: string, expiresAt: string, objectPath = `staging/${jobId}/file.hwp`): UploadSessionRecord {
  return { jobId, objectPath, fileName: "file.hwp", fileSize: 10, ownerType: "user", userId: "owner-1", expiresAt };
}

function firestoreUploadStore(scannedSessions: UploadSessionRecord[], currentSessions = scannedSessions) {
  const state = new Map(currentSessions.map((candidate) => [candidate.jobId, candidate]));
  const writes: UploadSessionRecord[] = [];
  let cursor: [string, string] | undefined;
  let cutoff = "";
  const docs = scannedSessions
    .map((candidate) => ({ id: candidate.jobId, ref: { id: candidate.jobId }, data: () => candidate }))
    .sort((a, b) => a.data().expiresAt.localeCompare(b.data().expiresAt) || a.id.localeCompare(b.id));
  const collection = {
    where: (_field: string, _operator: string, value: string) => { cutoff = value; return collection; },
    orderBy: () => collection,
    startAfter: (expiresAt: string, id: string) => { cursor = [expiresAt, id]; return collection; },
    limit: (limit: number) => ({
      get: async () => {
        const page = docs
          .filter((doc) => doc.data().expiresAt <= cutoff)
          .filter((doc) => !cursor || doc.data().expiresAt > cursor[0] || (doc.data().expiresAt === cursor[0] && doc.id > cursor[1]))
          .slice(0, limit);
        return { docs: page, size: page.length };
      },
    }),
    doc: (id: string) => ({ id }),
  };
  const transaction = {
    get: async (ref: { id: string }) => ({ exists: state.has(ref.id), data: () => state.get(ref.id) }),
    set: (_ref: { id: string }, value: UploadSessionRecord) => {
      writes.push(value);
      state.set(value.jobId, value);
    },
  };
  const firestore = {
    collection: () => collection,
    runTransaction: async <T>(fn: (tx: typeof transaction) => Promise<T>) => fn(transaction),
  };
  return { store: new FirestoreJobStore(firestore as never), state, writes };
}

describe("MemoryJobStore maintenance", () => {
  it("recovers a bounded batch instead of collapsing maintenance to one item", async () => {
    const store = new MemoryJobStore();
    const cutoff = new Date("2027-01-02T00:00:00.000Z");
    for (const id of ["batch-a", "batch-b", "batch-c"]) {
      await store.createJob(processingJob(id, iso(cutoff.getTime() - 1_000)));
    }

    const result = await store.recoverStaleProcessingJobs({ cutoff, limit: 2 });

    expect(result.jobs.map((job) => job.jobId)).toEqual(["batch-a", "batch-b"]);
    expect(result.nextCursor).toBeDefined();
  });

  it("recovers only stale processing jobs once and respects limit/cursor", async () => {
    const store = new MemoryJobStore();
    const cutoff = new Date("2027-01-02T00:00:00.000Z");
    await store.createJob(processingJob("a", iso(cutoff.getTime() - 2_000)));
    await store.createJob(processingJob("b", iso(cutoff.getTime() - 1_000)));
    await store.createJob(processingJob("current", iso(cutoff.getTime() - 1_000), "queued"));
    await store.createJob(processingJob("done", iso(cutoff.getTime() - 3_000), "completed"));
    await store.createJob({ ...processingJob("deleted", iso(cutoff.getTime() - 4_000), "deleted"), deletedAt: iso(cutoff.getTime() - 500) });

    const first = await store.recoverStaleProcessingJobs({ cutoff, limit: 1 });
    const second = await store.recoverStaleProcessingJobs({ cutoff, limit: 1, cursor: first.nextCursor });
    const repeat = await store.recoverStaleProcessingJobs({ cutoff, limit: 10 });

    expect(first.jobs.map((job) => job.jobId)).toEqual(["a"]);
    expect(second.jobs.map((job) => job.jobId)).toEqual(["b"]);
    expect(repeat.jobs).toEqual([]);
    expect((await store.getJob("current"))?.status).toBe("queued");
    expect((await store.getJob("done"))?.status).toBe("completed");
    expect((await store.getJob("deleted"))?.status).toBe("deleted");
  });

  it("loses the recovery claim when an active worker refreshes the timestamp", async () => {
    const store = new MemoryJobStore();
    const cutoff = new Date(Date.now() + 10);
    await store.createJob(processingJob("race", iso(cutoff.getTime() - 1_000)));
    const result = await store.recoverStaleProcessingJobs({ cutoff, limit: 10 }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      await store.updateJob("race", { status: "processing" });
    });
    expect(result.jobs).toEqual([]);
    expect((await store.getJob("race"))?.status).toBe("processing");
  });

  it("leaves a current processing job untouched", async () => {
    const store = new MemoryJobStore();
    const cutoff = new Date("2027-01-02T00:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(cutoff.getTime() + 1_000));
    await store.createJob(processingJob("current-processing", iso(cutoff.getTime() + 1_000)));

    const result = await store.recoverStaleProcessingJobs({ cutoff, limit: 10 });

    expect(result.jobs).toEqual([]);
    expect((await store.getJob("current-processing"))?.status).toBe("processing");
  });

  it("separates expiry transition from exact, owner-safe one-time cleanup claim", async () => {
    const store = new MemoryJobStore();
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    await store.createUploadSession(session("expired", iso(cutoff.getTime() - 1_000)));
    const page = await store.expireUploadSessionsForCleanup({ cutoff, limit: 1 });
    const repeatedExpiry = await store.expireUploadSessionsForCleanup({ cutoff, limit: 1 });
    expect(page.sessions[0]).toMatchObject({ jobId: "expired", status: "expired" });
    expect(repeatedExpiry.sessions).toEqual([page.sessions[0]]);
    expect(await store.claimExpiredUploadObject({ ...page.sessions[0], objectPath: "staging/foreign/file.hwp" })).toBeNull();
    expect(await store.claimExpiredUploadObject({ ...page.sessions[0], userId: "foreign" })).toBeNull();
    const claim = await store.claimExpiredUploadObject(page.sessions[0]);
    expect(claim).toMatchObject({ objectPath: page.sessions[0].objectPath, cleanupClaimedAt: expect.any(String) });
    expect(new Date(claim!.cleanupClaimedAt!).toISOString()).toBe(claim!.cleanupClaimedAt);
    expect(await store.claimExpiredUploadObject(page.sessions[0])).toBeNull();
  });

  it("reports the same count-only cleanup decisions as the persistent store", async () => {
    const store = new MemoryJobStore();
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const expiredAt = iso(cutoff.getTime() - 1_000);
    await store.createUploadSession({ ...session("alpha-private-id", expiredAt), status: "completed" });
    await store.createUploadSession({ ...session("bravo-private-id", expiredAt), cleanupClaimedAt: expiredAt });
    await store.createUploadSession(session("charlie-private-id", expiredAt, "private/path/secret.hwp"));

    const result = await store.expireUploadSessionsForCleanup({ cutoff, limit: 10 });
    const serialized = JSON.stringify(result.cleanupDiagnostics);

    expect(result.sessions.map((candidate) => candidate.jobId)).toEqual(["charlie-private-id"]);
    expect(result.cleanupDiagnostics).toEqual({
      completedOrStatus: 1,
      alreadyClaimed: 1,
      invalidExpiry: 0,
      expiryAfterCutoff: 0,
      identityMismatch: 0,
      accepted: 1,
    });
    expect(serialized).not.toContain("alpha-private-id");
    expect(serialized).not.toContain("bravo-private-id");
    expect(serialized).not.toContain("charlie-private-id");
    expect(serialized).not.toContain("private/path");
  });

  it.each([
    ["without a successor", 1, false],
    ["with a successor", 2, true],
  ] as const)("sets an exact-limit cursor only %s", async (_case, count, expectsCursor) => {
    const store = new MemoryJobStore();
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    for (let index = 0; index < count; index += 1) {
      await store.createUploadSession(session(`candidate-${index}`, iso(cutoff.getTime() - 2_000 + index)));
    }

    const first = await store.expireUploadSessionsForCleanup({ cutoff, limit: 1 });

    expect(first.sessions.map((candidate) => candidate.jobId)).toEqual(["candidate-0"]);
    expect(Boolean(first.nextCursor)).toBe(expectsCursor);
    if (first.nextCursor) {
      const second = await store.expireUploadSessionsForCleanup({ cutoff, limit: 1, cursor: first.nextCursor });
      expect(second.sessions.map((candidate) => candidate.jobId)).toEqual(["candidate-1"]);
      expect(second.nextCursor).toBeUndefined();
    }
  });

  it.each([
    ["completion timestamp", { completedAt: "2026-01-02T00:00:01.000Z" }],
    ["completed status", { status: "completed" as const }],
  ])("rejects cleanup claim after an expired session gains %s", async (_case, completion) => {
    const store = new MemoryJobStore();
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    await store.createUploadSession(session("completed-after-scan", iso(cutoff.getTime() - 1_000)));
    const page = await store.expireUploadSessionsForCleanup({ cutoff, limit: 1 });

    await store.completeUploadSession("completed-after-scan", completion);

    expect(await store.claimExpiredUploadObject(page.sessions[0])).toBeNull();
  });

  it("uses an opaque cursor for separator-like ids and rejects malformed cursors", async () => {
    const store = new MemoryJobStore();
    const cutoff = new Date("2027-01-02T00:00:00.000Z");
    await store.createJob(processingJob("id|with|separators", iso(cutoff.getTime() - 2_000)));
    await store.createJob(processingJob("next", iso(cutoff.getTime() - 1_000)));

    const first = await store.recoverStaleProcessingJobs({ cutoff, limit: 1 });
    const second = await store.recoverStaleProcessingJobs({ cutoff, limit: 1, cursor: first.nextCursor });

    expect(first.jobs.map((job) => job.jobId)).toEqual(["id|with|separators"]);
    expect(first.nextCursor).not.toContain("id|with|separators");
    expect(second.jobs.map((job) => job.jobId)).toEqual(["next"]);
    await expect(store.recoverStaleProcessingJobs({ cutoff, limit: 1, cursor: "not-a-maintenance-cursor" })).rejects.toThrow(
      "Invalid maintenance cursor",
    );
  });
});

describe("FirestoreJobStore transaction maintenance", () => {
  it("matches Memory diagnostics for static completed, claimed, cutoff, and accepted records", async () => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const expiredAt = iso(cutoff.getTime() - 1_000);
    const candidates = [
      { ...session("alpha", expiredAt), status: "completed" as const },
      { ...session("bravo", expiredAt), cleanupClaimedAt: expiredAt },
      session("charlie", expiredAt),
      session("outside-cutoff", iso(cutoff.getTime() + 1_000)),
    ];
    const memory = new MemoryJobStore();
    for (const candidate of candidates) await memory.createUploadSession(candidate);
    const { store: firestore } = firestoreUploadStore(candidates);

    const memoryResult = await memory.expireUploadSessionsForCleanup({ cutoff, limit: 10 });
    const firestoreResult = await firestore.expireUploadSessionsForCleanup({ cutoff, limit: 10 });

    expect(memoryResult.cleanupDiagnostics).toEqual(firestoreResult.cleanupDiagnostics);
    expect(memoryResult.cleanupDiagnostics).toEqual({
      completedOrStatus: 1,
      alreadyClaimed: 1,
      invalidExpiry: 0,
      expiryAfterCutoff: 0,
      identityMismatch: 0,
      accepted: 1,
    });
  });

  it.each([
    ["without a successor", 1, false],
    ["with a successor", 2, true],
  ] as const)("sets an exact-limit upload cursor only %s", async (_case, count, expectsCursor) => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const candidates = Array.from({ length: count }, (_, index) =>
      session(`candidate-${index}`, iso(cutoff.getTime() - 2_000 + index)));
    const { store } = firestoreUploadStore(candidates);

    const first = await store.expireUploadSessionsForCleanup({ cutoff, limit: 1 });

    expect(first.sessions.map((candidate) => candidate.jobId)).toEqual(["candidate-0"]);
    expect(Boolean(first.nextCursor)).toBe(expectsCursor);
    if (first.nextCursor) {
      const second = await store.expireUploadSessionsForCleanup({ cutoff, limit: 1, cursor: first.nextCursor });
      expect(second.sessions.map((candidate) => candidate.jobId)).toEqual(["candidate-1"]);
      expect(second.nextCursor).toBeUndefined();
    }
  });

  it("advances past a fully transaction-filtered upload page to the next candidate", async () => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const scannedA = session("a", iso(cutoff.getTime() - 2_000));
    const scannedB = session("b", iso(cutoff.getTime() - 1_000));
    const current = [{ ...scannedA, status: "completed" as const }, scannedB];
    const { store } = firestoreUploadStore([scannedA, scannedB], current);

    const first = await store.expireUploadSessionsForCleanup({ cutoff, limit: 1 });
    const second = await store.expireUploadSessionsForCleanup({ cutoff, limit: 1, cursor: first.nextCursor });

    expect(first.sessions).toEqual([]);
    expect(first.cleanupDiagnostics).toMatchObject({ completedOrStatus: 1, accepted: 0 });
    expect(first.nextCursor).toBeDefined();
    expect(second.sessions.map((candidate) => candidate.jobId)).toEqual(["b"]);
    expect(second.cleanupDiagnostics).toMatchObject({ completedOrStatus: 0, accepted: 1 });
    expect(second.nextCursor).toBeUndefined();
  });

  it("counts a candidate deleted before transaction re-read without writing", async () => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const scanned = session("deleted-private-id", iso(cutoff.getTime() - 1_000));
    const { store, writes } = firestoreUploadStore([scanned], []);

    const result = await store.expireUploadSessionsForCleanup({ cutoff, limit: 10 });

    expect(result.sessions).toEqual([]);
    expect(result.cleanupDiagnostics).toMatchObject({ identityMismatch: 1, accepted: 0 });
    expect(writes).toEqual([]);
    expect(JSON.stringify(result.cleanupDiagnostics)).not.toContain("deleted-private-id");
  });

  it("persists an accepted active candidate as expired", async () => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const candidate = { ...session("active", iso(cutoff.getTime() - 1_000)), status: "active" as const };
    const { store, state, writes } = firestoreUploadStore([candidate]);

    const result = await store.expireUploadSessionsForCleanup({ cutoff, limit: 10 });

    expect(result.sessions).toEqual([{ ...candidate, status: "expired", expiredAt: cutoff.toISOString() }]);
    expect(result.cleanupDiagnostics).toMatchObject({ accepted: 1 });
    expect(writes).toEqual([{ ...candidate, status: "expired", expiredAt: cutoff.toISOString() }]);
    expect(state.get(candidate.jobId)).toEqual(result.sessions[0]);
  });

  it("accepts an already-expired candidate without an unnecessary write", async () => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const candidate = {
      ...session("already-expired", iso(cutoff.getTime() - 1_000)),
      status: "expired" as const,
      expiredAt: iso(cutoff.getTime() - 500),
    };
    const { store, writes } = firestoreUploadStore([candidate]);

    const result = await store.expireUploadSessionsForCleanup({ cutoff, limit: 10 });

    expect(result.sessions).toEqual([candidate]);
    expect(result.cleanupDiagnostics).toMatchObject({ accepted: 1 });
    expect(writes).toEqual([]);
  });

  it("re-reads the job in the transaction and permits one recovery only", async () => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const state = new Map<string, JobRecord>([["stale", processingJob("stale", iso(cutoff.getTime() - 1_000))]]);
    const ref = { id: "stale" };
    const transaction = {
      get: async () => ({ exists: state.has("stale"), data: () => state.get("stale") }),
      set: (_ref: unknown, value: JobRecord) => state.set(value.jobId, value),
    };
    const query = { get: async () => ({ docs: [{ id: "stale", ref, data: () => state.get("stale") }], size: 1 }) };
    const collection = { where: () => collection, orderBy: () => collection, limit: () => query, doc: () => ref };
    const firestore = { collection: () => collection, runTransaction: async <T>(fn: (tx: typeof transaction) => Promise<T>) => fn(transaction) };
    const store = new FirestoreJobStore(firestore as never);

    const first = await store.recoverStaleProcessingJobs({ cutoff, limit: 10 });
    const second = await store.recoverStaleProcessingJobs({ cutoff, limit: 10 });
    expect(first.jobs.map((job) => job.jobId)).toEqual(["stale"]);
    expect(second.jobs).toEqual([]);
  });

  it("does not recover a job refreshed between scan and transaction", async () => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const scanned = processingJob("race", iso(cutoff.getTime() - 1_000));
    const current = processingJob("race", iso(cutoff.getTime() + 1_000));
    const ref = { id: "race" };
    const transaction = { get: async () => ({ exists: true, data: () => current }), set: () => undefined };
    const query = { get: async () => ({ docs: [{ id: "race", ref, data: () => scanned }], size: 1 }) };
    const collection = { where: () => collection, orderBy: () => collection, limit: () => query, doc: () => ref };
    const firestore = { collection: () => collection, runTransaction: async <T>(fn: (tx: typeof transaction) => Promise<T>) => fn(transaction) };

    const result = await new FirestoreJobStore(firestore as never).recoverStaleProcessingJobs({ cutoff, limit: 10 });

    expect(result.jobs).toEqual([]);
  });

  it("advances from a transaction-rejected page without skipping or repeating the next candidate", async () => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const staleA = processingJob("a", iso(cutoff.getTime() - 2_000));
    const staleB = processingJob("b", iso(cutoff.getTime() - 1_000));
    const state = new Map<string, JobRecord>([["a", { ...staleA, status: "completed" }], ["b", staleB]]);
    let startAfter: [string, string] | undefined;
    const docs = [staleA, staleB].map((job) => ({ id: job.jobId, ref: { id: job.jobId }, data: () => job }));
    const collection = {
      where: () => collection,
      orderBy: () => collection,
      startAfter: (timestamp: string, id: string) => { startAfter = [timestamp, id]; return collection; },
      limit: (limit: number) => ({
        get: async () => {
          const page = docs.filter((doc) => !startAfter || doc.data().updatedAt > startAfter[0] || (doc.data().updatedAt === startAfter[0] && doc.id > startAfter[1])).slice(0, limit);
          return { docs: page, size: page.length };
        },
      }),
      doc: (id: string) => ({ id }),
    };
    const transaction = {
      get: async (ref: { id: string }) => ({ exists: state.has(ref.id), data: () => state.get(ref.id) }),
      set: (_ref: { id: string }, value: JobRecord) => state.set(value.jobId, value),
    };
    const firestore = { collection: () => collection, runTransaction: async <T>(fn: (tx: typeof transaction) => Promise<T>) => fn(transaction) };
    const store = new FirestoreJobStore(firestore as never);

    const first = await store.recoverStaleProcessingJobs({ cutoff, limit: 1 });
    const second = await store.recoverStaleProcessingJobs({ cutoff, limit: 1, cursor: first.nextCursor });

    expect(first.jobs).toEqual([]);
    expect(first.nextCursor).toBeDefined();
    expect(second.jobs.map((job) => job.jobId)).toEqual(["b"]);
  });

  it("revalidates exact upload ownership and path before emitting a cleanup candidate", async () => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const scanned = session("expired", iso(cutoff.getTime() - 1_000));
    const current = { ...scanned, objectPath: "staging/foreign/file.hwp", userId: "foreign" };
    const ref = { id: "expired" };
    const transaction = { get: async () => ({ exists: true, data: () => current }), set: () => undefined };
    const query = { get: async () => ({ docs: [{ id: "expired", ref, data: () => scanned }], size: 1 }) };
    const collection = { where: () => collection, orderBy: () => collection, limit: () => query, doc: () => ref };
    const firestore = { collection: () => collection, runTransaction: async <T>(fn: (tx: typeof transaction) => Promise<T>) => fn(transaction) };

    const result = await new FirestoreJobStore(firestore as never).expireUploadSessionsForCleanup({ cutoff, limit: 10 });

    expect(result.sessions).toEqual([]);
    expect(result.cleanupDiagnostics).toEqual({
      completedOrStatus: 0,
      alreadyClaimed: 0,
      invalidExpiry: 0,
      expiryAfterCutoff: 0,
      identityMismatch: 1,
      accepted: 0,
    });
  });

  it.each([
    ["completed status", { status: "completed" as const }, "completedOrStatus"],
    ["completion marker", { completedAt: iso(Date.parse("2026-01-01T23:59:59.000Z")) }, "completedOrStatus"],
    ["cleanup claim", { cleanupClaimedAt: iso(Date.parse("2026-01-01T23:59:59.000Z")) }, "alreadyClaimed"],
    ["expiry after cutoff", { expiresAt: iso(Date.parse("2026-01-02T00:00:01.000Z")) }, "expiryAfterCutoff"],
  ] as const)("counts %s cleanup rejection without writing", async (_case, mutation, category) => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const scanned = session("diagnostic-session", iso(cutoff.getTime() - 1_000));
    const current = { ...scanned, ...mutation };
    const ref = { id: "diagnostic-session" };
    let writes = 0;
    const transaction = { get: async () => ({ exists: true, data: () => current }), set: () => { writes += 1; } };
    const query = { get: async () => ({ docs: [{ id: "diagnostic-session", ref, data: () => scanned }], size: 1 }) };
    const collection = { where: () => collection, orderBy: () => collection, limit: () => query, doc: () => ref };
    const firestore = { collection: () => collection, runTransaction: async <T>(fn: (tx: typeof transaction) => Promise<T>) => fn(transaction) };

    const result = await new FirestoreJobStore(firestore as never).expireUploadSessionsForCleanup({ cutoff, limit: 10 });

    expect(result.sessions).toEqual([]);
    expect(result.cleanupDiagnostics).toMatchObject({ [category]: 1, accepted: 0 });
    expect(writes).toBe(0);
  });

  it("rejects a non-parseable expiry without exposing the stored value", async () => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const scanned = session("invalid-expiry-session", "0000-invalid-expiry");
    const ref = { id: scanned.jobId };
    let writes = 0;
    const transaction = { get: async () => ({ exists: true, data: () => scanned }), set: () => { writes += 1; } };
    const query = { get: async () => ({ docs: [{ id: scanned.jobId, ref, data: () => scanned }], size: 1 }) };
    const collection = { where: () => collection, orderBy: () => collection, limit: () => query, doc: () => ref };
    const firestore = { collection: () => collection, runTransaction: async <T>(fn: (tx: typeof transaction) => Promise<T>) => fn(transaction) };

    const result = await new FirestoreJobStore(firestore as never).expireUploadSessionsForCleanup({ cutoff, limit: 10 });
    const serialized = JSON.stringify(result.cleanupDiagnostics);

    expect(result.sessions).toEqual([]);
    expect(result.cleanupDiagnostics).toMatchObject({ invalidExpiry: 1, accepted: 0 });
    expect(writes).toBe(0);
    expect(serialized).not.toContain("0000-invalid-expiry");
  });

  it("counts accepted cleanup candidates without serializing their identity", async () => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const candidate = {
      ...session("sensitive-job-id", iso(cutoff.getTime() - 1_000), "private/path/secret.hwp"),
      userId: "private-user",
      accessTokenHash: "token-like-secret",
    };
    const ref = { id: candidate.jobId };
    const transaction = { get: async () => ({ exists: true, data: () => candidate }), set: () => undefined };
    const query = { get: async () => ({ docs: [{ id: candidate.jobId, ref, data: () => candidate }], size: 1 }) };
    const collection = { where: () => collection, orderBy: () => collection, limit: () => query, doc: () => ref };
    const firestore = { collection: () => collection, runTransaction: async <T>(fn: (tx: typeof transaction) => Promise<T>) => fn(transaction) };

    const result = await new FirestoreJobStore(firestore as never).expireUploadSessionsForCleanup({ cutoff, limit: 10 });
    const serialized = JSON.stringify(result.cleanupDiagnostics);

    expect(result.cleanupDiagnostics).toMatchObject({ accepted: 1 });
    expect(serialized).not.toContain("sensitive-job-id");
    expect(serialized).not.toContain("private/path");
    expect(serialized).not.toContain("private-user");
    expect(serialized).not.toContain("token-like-secret");
  });

  it.each([
    ["completed", { status: "completed" as const }],
    ["completed timestamp", { completedAt: iso(Date.parse("2026-01-01T23:59:59.000Z")) }],
    ["expiry moved beyond cutoff", { expiresAt: iso(Date.parse("2026-01-02T00:00:01.000Z")) }],
  ])("rejects a session that becomes %s before the transaction", async (_case, mutation) => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const scanned = session("expired", iso(cutoff.getTime() - 1_000));
    const current = { ...scanned, ...mutation };
    const ref = { id: "expired" };
    let writes = 0;
    const transaction = { get: async () => ({ exists: true, data: () => current }), set: () => { writes += 1; } };
    const query = { get: async () => ({ docs: [{ id: "expired", ref, data: () => scanned }], size: 1 }) };
    const collection = { where: () => collection, orderBy: () => collection, limit: () => query, doc: () => ref };
    const firestore = { collection: () => collection, runTransaction: async <T>(fn: (tx: typeof transaction) => Promise<T>) => fn(transaction) };

    const result = await new FirestoreJobStore(firestore as never).expireUploadSessionsForCleanup({ cutoff, limit: 10 });

    expect(result.sessions).toEqual([]);
    expect(writes).toBe(0);
  });

  it("returns the same claimed upload session record written by the transaction", async () => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const candidate = { ...session("expired", iso(cutoff.getTime() - 1_000)), status: "expired" as const };
    const ref = { id: candidate.jobId };
    let written: typeof candidate & { cleanupClaimedAt?: string } | undefined;
    const transaction = {
      get: async () => ({ exists: true, data: () => candidate }),
      set: (_ref: typeof ref, value: typeof written) => { written = value; },
    };
    const collection = { doc: () => ref };
    const firestore = {
      collection: () => collection,
      runTransaction: async <T>(fn: (tx: typeof transaction) => Promise<T>) => fn(transaction),
    };
    const store = new FirestoreJobStore(firestore as never);

    const claim = await store.claimExpiredUploadObject(candidate);

    expect(claim).toEqual(written);
    expect(claim).toMatchObject({ objectPath: candidate.objectPath, cleanupClaimedAt: expect.any(String) });
    expect(new Date(claim!.cleanupClaimedAt!).toISOString()).toBe(claim!.cleanupClaimedAt);
  });

  it.each([
    ["completion timestamp", { completedAt: "2026-01-02T00:00:01.000Z" }],
    ["completed status", { status: "completed" as const }],
  ])("rejects cleanup claim when the transaction sees %s", async (_case, completion) => {
    const cutoff = new Date("2026-01-02T00:00:00.000Z");
    const candidate = { ...session("completed-after-scan", iso(cutoff.getTime() - 1_000)), status: "expired" as const };
    const current = { ...candidate, ...completion };
    const ref = { id: candidate.jobId };
    let writes = 0;
    const transaction = {
      get: async () => ({ exists: true, data: () => current }),
      set: () => { writes += 1; },
    };
    const collection = { doc: () => ref };
    const firestore = {
      collection: () => collection,
      runTransaction: async <T>(fn: (tx: typeof transaction) => Promise<T>) => fn(transaction),
    };
    const store = new FirestoreJobStore(firestore as never);

    expect(await store.claimExpiredUploadObject(candidate)).toBeNull();
    expect(writes).toBe(0);
  });
});
