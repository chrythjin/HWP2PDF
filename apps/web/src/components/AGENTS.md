# apps/web/src/components/AGENTS.md

Reusable React UI components. Parent AGENTS.md and `apps/web/AGENTS.md` cover the Next.js 16.2.9 caveats — read those first.

## Components

| File | Purpose | Client/server |
|---|---|---|
| `DropzoneUploader.tsx` | Main HWP upload widget — file validation, multipart OR direct-to-GCS signed upload, polling, download trigger | `"use client"` |
| `JobHistoryList.tsx` | Member job history table with state machine (loading/success/empty/error/auth-error) | `"use client"` |
| `ConfirmationDialog.tsx` | Replaces native `confirm()` — accessibility-tested | `"use client"` |
| `PageLayout.tsx` | Shared page chrome (nav, footer, ad slots) | server-renderable wrapper |
| `MobileNav.tsx` | Responsive navigation panel with keyboard a11y | `"use client"` |
| `AuthNav.tsx` | Auth-aware nav state (login/logout/profile) | `"use client"` |
| `AdSenseAd.tsx` | `<AdSenseAd slot="..." />` wrapper using `next/script` (`strategy="beforeInteractive"`) | `"use client"` |

## Patterns

- All client components use `"use client"` directive. Use server components for static surfaces.
- Props use explicit TypeScript interfaces; never `any`. Accessibility attributes (`role`, `aria-live`, `aria-busy`, `aria-pressed`) on all interactive elements (memory #344).
- Token persistence (`sessionStorage`) lives in `apps/web/src/lib/upload-token.ts`; do not introduce storage logic inside components.
- API calls go through `fetchWithAuth` (`apps/web/src/lib/api-client.ts`) which handles Firebase ID token injection, response error mapping, and `ApiClientError`.

## Anti-patterns

- Don't render ad scripts with raw `<script src=...>` — use `AdSenseAd` (already loads via `next/script` with `beforeInteractive` strategy).
- Don't `window.sessionStorage` outside `upload-token.ts`. SSR and disabled-storage cases must `try/catch` and degrade gracefully.
- Don't reimplement polling/backoff logic — it lives in `DropzoneUploader`, share via hook if a second widget needs it.
- Don't add env reads like `process.env.NEXT_PUBLIC_*` from non-public env (CVE-class secret exposure).

## Tests

- Co-located: `DropzoneUploader.a11y.test.tsx`, `JobHistoryList.test.tsx`, `ConfirmationDialog.test.tsx`, `MobileNav.test.tsx`. Run with `pnpm --filter web test`.
