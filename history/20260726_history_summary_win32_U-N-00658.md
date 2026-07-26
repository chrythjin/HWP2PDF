# History Summary

- Timestamp: 2026-07-26 KST
- User: U-N-00658
- OS: win32
- Change type: Documentation and API remediation
- Added `docs/reviews/20260726_code-review-fact-check.md` containing an evidence-based correction of the prior code-review findings.
- Added `docs/sessions/20260726_003434_code-review-fact-check.md` as the required session note.
- Updated `apps/api/src/middleware/AGENTS.md` to document the implemented `request.user.uid` auth contract.
- Updated the inline conversion dispatcher to claim queued jobs before conversion and safely summarize asynchronous conversion failures.
- Removed duplicate Firestore stale-job cursor parsing and replaced raw conversion/storage error details with event, errorName, and errorCode fields.
- Added inline dispatcher regression coverage for both successful claims and noop claims.
- Backed up every modified pre-existing file under `history/file-backups/` before editing.
- Validation passed: API typecheck; dispatcher regression tests (26); full API Vitest suite (18 files, 390 tests); workspace lint; workspace build; and a manual inline dispatcher noop check against the built API modules.
