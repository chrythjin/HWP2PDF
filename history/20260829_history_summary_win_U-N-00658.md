# History Summary - 20260829 (win / U-N-00658)

## User Request

웹사이트에 광고 게시 안되는 이유 찾아줘 및 후속 조치 진행

## Changes

- `apps/web/src/app/layout.tsx`: AdSense SDK 스크립트 로드를 `id="adsense-script"`, `strategy="afterInteractive"`로 통일
- `apps/web/src/components/AdSenseAd.tsx`: 중복 `<Script>` 태그를 제거하고 `<ins className="adsbygoogle" ...>` 및 안전한 `push({})` 처리로 최적화
- `apps/web/next.config.ts`: CSP 보안 헤더에 Google AdSense 크리에이티브 및 통신 서브도메인 추가
  - `connect-src`: `https://pagead2.googlesyndication.com`, `https://googleads.g.doubleclick.net`, `https://tpc.googlesyndication.com` 추가
  - `script-src`: `https://tpc.googlesyndication.com`, `https://adservice.google.com`, `https://googleads.g.doubleclick.net` 추가
  - `frame-src`: `https://tpc.googlesyndication.com` 추가
- `apps/web/src/components/AGENTS.md`: 컴포넌트 패턴 문서 최신화

## Before

- `layout.tsx`와 `AdSenseAd.tsx`에서 서로 다른 전략(`beforeInteractive` vs `lazyOnload`)과 id로 `adsbygoogle.js`를 이중 로드하여 초기화 충돌 위험 존재
- CSP 정책에 AdSense 광고 서빙 및 iframe 관련 구글 서브도메인(`tpc.googlesyndication.com` 등)이 누락되어 브라우저 리소스 차단 위험 존재

## After

- AdSense SDK는 `layout.tsx`에서 1회 정상 로드되고, `AdSenseAd.tsx`는 광고 슬롯 컨테이너와 푸시 로직만 담당
- 필수 Google AdSense 도메인이 CSP에 모두 등록되어 광고 리소스 차단 방지
- `corepack pnpm --filter web test` (13개 파일, 175개 테스트 전체 통과) 및 `corepack pnpm -r build` 정상 완료
