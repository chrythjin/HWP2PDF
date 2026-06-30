# Worker queued claim compare-and-set

Date: 2026-06-30

## Summary

Implemented T5 of `.omo/plans/hwp2pdf-review-fixes.md`: the API worker now claims queued jobs through an explicit job-store compare-and-set boundary before running conversion. This prevents duplicate concurrent worker deliveries from starting conversion twice while preserving existing conversion success/failure updates.

## Files changed

- `apps/api/src/services/job-store.ts` adds `ClaimQueuedJobResult`, `claimQueuedJobForProcessing`, Memory re-check semantics, and Firestore transaction-backed claim semantics.
- `apps/api/src/routes/v1.ts` uses the claim result in `POST /internal/workers/convert` before `convertJobToPdf`.
- `apps/api/src/routes/v1.worker.test.ts` adds concurrent duplicate and lock-lost route coverage for `worker-race-001` and `worker-lock-lost-001`.
- `apps/api/src/services/job-store.auth.test.ts` adds direct MemoryJobStore and mocked FirestoreJobStore claim tests.
- `.omo/evidence/task-5-hwp2pdf-review-fixes.md` records RED/GREEN evidence, LSP limitation, OCR notes, and residual risk.

## Verification

- `pnpm --filter api test -- v1.worker` -> exit 0, 18/18 tests passed.
- `pnpm --filter api test -- job-store.auth` -> exit 0, 43/43 tests passed.
- `pnpm --filter api typecheck` -> exit 0.
- `pnpm --filter api build` -> exit 0.
- `ocr review` completed; in-scope API findings were addressed.

## Notes

- Firestore conditional claim was proven with a mocked transaction path rather than emulator-backed testing in this local run.
- agent-lsp diagnostics could not run because the local TypeScript LSP configuration/path handling failed on `C:\NEW PRG\...`; `tsc --noEmit` and build were used as compiler verification.
