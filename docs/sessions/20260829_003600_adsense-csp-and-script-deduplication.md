# AdSense CSP and Script Deduplication

- **Context**: Investigated why AdSense ads may not render on the live website and addressed frontend script/header issues.
- **Root Cause & Remedies**:
  1. Identified duplicate AdSense script declarations across `apps/web/src/app/layout.tsx` (`strategy="beforeInteractive"`) and `apps/web/src/components/AdSenseAd.tsx` (`strategy="lazyOnload"`). Consolidated script loading into `layout.tsx` using `strategy="afterInteractive"` and streamlined `AdSenseAd.tsx` to handle ad unit `<ins>` containers and `window.adsbygoogle.push({})`.
  2. Enhanced `next.config.ts` Content Security Policy (CSP) directives for `connect-src`, `script-src`, and `frame-src` with `tpc.googlesyndication.com`, `adservice.google.com`, and `googleads.g.doubleclick.net` to ensure no Google AdSense creative/ad iframe network requests are blocked.
  3. Verified `corepack pnpm --filter web test` (13 test files, 175 tests pass), `corepack pnpm --filter web typecheck`, and workspace build `corepack pnpm -r build`.
