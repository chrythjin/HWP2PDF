# 2026-08-01 변경 이력

## User Request

AdSense의 콘텐츠가 없거나 부족한 화면에 Google 광고를 게재할 수 없다는 정책 위반을 수정한다.

## Changes

- `apps/web/src/app/layout.tsx`에서 모든 라우트에 적용되던 AdSense 스크립트를 제거했다.
- `apps/web/src/components/AdSenseAd.tsx`가 명시적 광고 단위가 있는 화면에서만 AdSense 스크립트를 지연 로드하도록 변경했다.
- 광고 클라이언트 환경 변수가 없을 때 광고 코드가 렌더링되지 않도록 했다.
- 변경 전 원본을 `history/file-backups/`에 보관했다.

## Before

루트 레이아웃이 AdSense 스크립트를 전역으로 로드하여 로그인, 회원가입, 글쓰기, 빈 내역 등 게시자 콘텐츠가 부족하거나 행동 중심인 화면에도 자동 광고가 주입될 수 있었다.

## After

AdSense 코드는 충분한 게시자 콘텐츠와 명시적 광고 단위가 있는 홈 화면에서만 로드된다. 직접 진입한 정책 위험 라우트에서는 광고 스크립트와 광고 단위가 렌더링되지 않는다.
