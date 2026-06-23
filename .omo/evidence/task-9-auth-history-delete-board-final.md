# Task 9 Evidence: Web Firebase auth shell and navigation

## Summary

Implemented the web Firebase client-auth shell for `apps/web`:

- Added `firebase` to the web package dependencies and refreshed `pnpm-lock.yaml` via `pnpm install`.
- Added client Firebase initialization with public `NEXT_PUBLIC_FIREBASE_*` config and hot-reload-safe app reuse.
- Added `AuthProvider`/`useAuth` for Firebase Auth state, email/password login, signup, logout, loading, and error handling.
- Wrapped the App Router root layout with the client `AuthProvider` while keeping `layout.tsx` as a Server Component boundary.
- Added `/login` and `/signup` client pages with simple email/password forms and redirect-on-success.
- Added `AuthNav` and wired it into `PageLayout` to show login/signup links or current user email plus logout.
- Added `fetchWithAuth(route, options?)`, which reads the current Firebase user and attaches `Authorization: Bearer <idToken>` only when authenticated.
- Added env typings and `.env.local.example` entries for Firebase public config.
- Added auth/provider and API-client tests.

## Next.js 16.2.9 docs consulted

- `node_modules/next/dist/docs/01-app/03-building-your-application/03-rendering/02-client-components.mdx`
- `node_modules/next/dist/docs/01-app/03-building-your-application/01-routing/03-layouts-and-pages.mdx`
- `node_modules/next/dist/docs/01-app/03-building-your-application/01-routing/05-linking-and-navigating.mdx`

Decision: keep route layouts as Server Components and import small Client Components (`AuthProvider`, `AuthNav`, login/signup pages) only where browser state/Firebase SDK/hooks are required.

## TDD / tests added

- `apps/web/src/auth/AuthProvider.test.tsx`
  - Loading-to-user state via `onAuthStateChanged`.
  - Login/signup/logout calls.
  - Error state and `clearError`.
  - `useAuth` provider-boundary guard.
- `apps/web/src/lib/api-client.auth.test.ts`
  - Adds bearer token when authenticated.
  - Omits Authorization when anonymous.
  - Preserves caller headers.
  - Supports absolute URLs.

Existing auth-adjacent tests were adjusted only to match the new auth/provider boundary and lazy `getFirebaseAuth().currentUser` API.

## Verification

Commands run from repository root:

```powershell
pnpm --filter web test
```

Result: 6 test files passed, 58 tests passed.

```powershell
pnpm --filter web typecheck
```

Result: exit 0.

```powershell
pnpm --filter web build
```

Result: exit 0; Next.js 16.2.9 build compiled, type-checked, and generated static pages successfully.

```powershell
ocr review
```

Result: did not complete within the 180s command timeout. It reviewed/skipped many files but terminated before a final report; no completed OCR verdict is claimed.

## Notes

- No Firebase Admin SDK or server secrets were added to web code.
- No API package code was modified for this task.
- `.env.local.example` uses placeholder values only.
