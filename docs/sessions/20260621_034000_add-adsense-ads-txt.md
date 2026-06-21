---
title: AdSense ads.txt 추가
summary: Google AdSense "게시자 콘텐츠가 없는 화면에 Google 게재 광고 / 찾을 수 없음" 경고를 해결하기 위해 `apps/web/public/ads.txt`를 추가한 세션.
tags: [adsense, ads-txt, vercel, nextjs, deployment]
---

# AdSense ads.txt 추가

## 배경

Vercel에 배포된 `https://hwp2pdf-phi.vercel.app`에서 Google AdSense 검사 결과 **"게시자 콘텐츠가 없는 화면에 Google 게재 광고 / 찾을 수 없음"** 경고가 발생했습니다. 원인은 AdSense가 사이트 루트의 `/ads.txt`를 요구하는데, 해당 파일이 존재하지 않았기 때문입니다.

## 변경 사항

- `apps/web/public/ads.txt` 신규 생성
  - Next.js `public/` 디렉터리의 파일은 빌드 시 그대로 `/ads.txt` 경로로 서빙됩니다.
- 파일 내용:
  ```
  google.com, pub-5221391672019535, DIRECT, f08c47fec0942fa0
  ```
  - `pub-5221391672019535`는 현재 설정된 `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-5221391672019535`에서 `ca-` 접두사를 제거한 퍼블리셔 ID입니다.
  - `f08c47fec0942fa0`는 Google AdSense `DIRECT` 항목의 표준 인증자 ID입니다.

## 검증

1. `pnpm --filter web build` 성공 (Next.js 16.2.9, Turbopack).
2. `pnpm exec next dev apps/web --port 3005`로 개발 서버를 띄운 뒤 `GET http://localhost:3005/ads.txt` 요청:
   - HTTP 200
   - 응답 본문: `google.com, pub-5221391672019535, DIRECT, f08c47fec0942fa0`

## 후속 작업

- `ads.txt`가 Vercel 프로덕션에 반영되려면 git commit/push 후 GitHub Actions → Vercel 배포가 완료되어야 합니다.
- 배포 완료 후 `https://hwp2pdf-phi.vercel.app/ads.txt`가 위 내용과 동일한지 확인하면 AdSense 경고가 사라집니다.
