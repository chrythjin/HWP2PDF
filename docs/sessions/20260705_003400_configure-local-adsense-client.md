# Configure Local AdSense Client

## Context
Google AdSense was integrated into the frontend, but the AdSense script was not loading during local development or production when the `NEXT_PUBLIC_ADSENSE_CLIENT` environment variable was missing from `.env.local`.

## Changes Made
- Added `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-5221391672019535` to `apps/web/.env.local`.
- Added a placeholder `NEXT_PUBLIC_ADSENSE_CLIENT=your-adsense-client` to `apps/web/.env.local.example`.

## Verification
- Verified compilation and types using `pnpm typecheck`.
