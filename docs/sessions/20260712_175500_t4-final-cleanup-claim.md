# T4 final cleanup claim correction

## Scope
- Corrected the final expired-upload cleanup claim race found by independent review.
- No T5 endpoint, object deletion, Cloud Tasks, Scheduler/IAM, frontend/shared contract, or plan checkbox was changed.

## Change
- Memory and Firestore now share an explicit cleanup eligibility rule: current status is `expired`, `completedAt` is absent, and `cleanupClaimedAt` is absent.
- The existing exact `jobId`, object path, owner identity, token hash, and expiry comparison remains required before claim.
- Added Memory and mocked-Firestore regressions for completion between expiry scan and final claim; the Firestore test verifies no transaction write.

## Verification
- RED: focused maintenance suite failed 2 of 18 tests on the intended `completedAt` race.
- GREEN: focused maintenance suite passed 18/18.
- Full API suite passed 311/311 across 14 files.
- `pnpm --filter api build` exited 0.
- LSP diagnostics reported no issues in the changed source and test files.

## Limitation
- Firestore emulator/production conflict retry and real GCS/Cloud Tasks integration were not executed; Firestore evidence is transaction-mock precondition coverage.
