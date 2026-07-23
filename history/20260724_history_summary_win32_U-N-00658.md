# History Summary 2026-07-24

## Changes

- Completed a full API, web, shared-contract, and dependency review.
- Fixed direct upload token propagation, expired upload completion, runtime JSON validation, metadata-retention enforcement, and upload failure cleanup.
- Added recoverable 5-minute leases for upload cleanup and job deletion, with claim-id-conditional finalization.
- Kept deletion payloads in private cleanup records and public tombstones privacy-safe.
- Added maintenance-driven physical purge for expired member metadata and finalized tombstones.
- Added exact completion-claim fencing, removed completed upload-session payloads, and recovered stale queued dispatches through maintenance.
- Globally ordered Firestore metadata/tombstone purge candidates by effective deadline to prevent cross-class starvation.
- Patched vulnerable direct and transitive dependencies with narrow upgrades and root `pnpm.overrides`.
- Added regression coverage for races, partial failures, lease recovery, owner-check ordering, preservation expiry, and Firestore purge pagination.
- Added session note `docs/sessions/20260724_043535_full-review-lease-purge-remediation.md`.
- Backed up the final Firestore purge fairness correction in `history/file-backups/20260724_052000_firestore-purge-fairness.md` with before/after source context and its regression contract.

## Verification

- 610 tests passed: shared 47, API 389, web 174.
- Workspace lint and production build passed.
- Production dependency audit reported no known vulnerabilities.
- Live built Express, Next.js, and job-store module surfaces were exercised successfully.
- Final independent review reported Critical 0, High 0, Medium 0.
