# T4 transaction safety correction

- Replaced ambiguous maintenance cursors with a versioned opaque base64url tuple and strict decoding.
- Stale job recovery now transactionally matches the scanned timestamp as well as status and cutoff, preventing worker refresh rollback.
- Upload-session expiry emits cleanup candidates only when transaction state still matches exact owner identity, object path, job ID, and expiry.
- Added focused regressions for bounded batches, races, rejected page candidates, cursor ambiguity, terminal/deleted exclusion, idempotency, and foreign-object protection.
- Verified API tests (302/302), API typecheck/build, and clean LSP diagnostics for the changed source and test files.
- Firestore emulator/production conflict retries remain environment-level validation; no scheduler, endpoint, deletion call, or deployment resource was added.
