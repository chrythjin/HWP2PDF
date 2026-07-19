# 2026-07-12 History Summary

## User Request
Implement T4 transaction-safe stale job and expired upload-session recovery primitives.

## Changes
- Added narrow bounded maintenance contracts and Memory/Firestore implementations.
- Added transaction re-read, one-time dispatch candidate, terminal expiry, and exact cleanup claim behavior.
- Added focused maintenance tests and required evidence/session artifacts.

## Before
- Dispatcher reset stale jobs through an unconditional generic update after a non-transactional read.
- Expired upload sessions were deleted immediately, preventing safe deletion revalidation.

## After
- Only stale processing jobs atomically recovered by the maintenance primitive are dispatch candidates.
- Expiry transition is separate from exact object cleanup claim and is idempotent.
