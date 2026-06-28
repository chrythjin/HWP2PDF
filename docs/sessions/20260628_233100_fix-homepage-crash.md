# Session: Fix Homepage Crash due to Missing Firebase Configuration

- **Date**: 2026-06-28
- **Topic**: Front-end initialization fallback
- **Description**: Add checks to handle unconfigured Firebase setup gracefully instead of crashing the Next.js landing page.

## Problem
In local development, if Firebase environment variables are not set (e.g. `NEXT_PUBLIC_FIREBASE_API_KEY` is missing or placeholder), the Firebase SDK throws `FirebaseError: Firebase: Error (auth/invalid-api-key)` when attempting to load Auth. Because this error happened inside `useEffect` of the client-side `AuthProvider` context component, it caused an infinite hydration/render loop and crashed the landing page.

## Solution
1. **Configuration Detection**: Added `isFirebaseConfigured` export in `apps/web/src/lib/firebase.ts` to check if keys are present and not placeholders (with fallback to `true` in test environments to allow normal mock testing).
2. **Graceful Fallback**:
   - In `AuthProvider.tsx`, if `isFirebaseConfigured` is false, authentication listeners are skipped, and `loading` is set to false immediately.
   - User actions (`login`, `signup`, `logout`) return a controlled error message rather than trying to call the unconfigured SDK.
3. **Mocks Update**: Updated test mocks for `@/lib/firebase` in `board-page.test.tsx` and `DropzoneUploader.auth.test.tsx` to include `isFirebaseConfigured: true`.

## Results
- HomePage loads successfully in guest mode when Firebase environment variables are missing.
- All 58 unit and integration tests compile and pass successfully.
