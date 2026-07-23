# Firestore purge fairness change backup

## Scope

- Product file: `apps/api/src/services/job-store.ts`
- Regression file: `apps/api/src/services/job-store.maintenance.test.ts`
- Baseline source backup: `history/file-backups/apps_api_src_services_job-store.ts_20260724_024423_win32_U-N-00658`
- Full maintenance regression diff: `history/file-backups/20260724_043535_lease-purge-maintenance.patch`

This record captures the final incremental correction applied after the baseline backups above. It is a source-context backup, not a directly applicable patch.

## Product change

Symbol: `FirestoreJobStore.purgeExpiredJobs`

Previous candidate merge:

```ts
const candidates = [...metadataSnapshot.docs, ...tombstoneSnapshot.docs]
  .filter((doc, index, all) => all.findIndex((other) => other.id === doc.id) === index);
```

Current candidate merge:

```ts
const candidates = [...metadataSnapshot.docs, ...tombstoneSnapshot.docs]
  .filter((doc, index, all) => all.findIndex((other) => other.id === doc.id) === index)
  .sort((a, b) => {
    const aJob = a.data() as JobRecord;
    const bJob = b.data() as JobRecord;
    const aDeadline = isDeleted(aJob) ? aJob.tombstoneUntil : aJob.metadataExpiresAt;
    const bDeadline = isDeleted(bJob) ? bJob.tombstoneUntil : bJob.metadataExpiresAt;
    return (aDeadline ?? "").localeCompare(bDeadline ?? "") || a.id.localeCompare(b.id);
  });
```

## Regression contract

Test: `purges the oldest deadline fairly when metadata and tombstone queries share a limit`

- Arrange one expired metadata row and one older expired tombstone row.
- Invoke `FirestoreJobStore.purgeExpiredJobs({ cutoff, limit: 1 })` twice.
- First invocation must purge the older tombstone and return `{ purged: 1, hasMore: true }`.
- Second invocation must purge the metadata row and return `{ purged: 1, hasMore: false }`.
- Final mocked Firestore state must be empty.

## Restore guidance

To remove only this final correction, replace the current candidate merge with the previous candidate merge and remove the regression named above. The original pre-review source remains available in the timestamped baseline backup listed under Scope.
