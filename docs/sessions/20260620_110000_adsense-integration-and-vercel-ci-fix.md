---
title: AdSense 적용 및 Vercel CI/CD 복구
date: 2026-06-20T11:30:00+09:00
summary: HWP2PDF에 AdSense 광고를 적용하고, GitHub Actions 기반 Vercel 자동 배포 파이프라인을 복구한 세션.
tags: [adsense, vercel, nextjs, deployment, ci-cd]
---

# AdSense 적용 및 Vercel CI/CD 복구

## 작업 목적

- AdSense 정책에 맞춰 필수 페이지(개인정보처리방침, 이용약관, 문의) 생성
- 메인 페이지 콘텐츠 보강(FAQ, 사용 방법)
- AdSense 스크립트 및 광고 단위 적용
- GitHub Actions를 통한 Vercel 자동 배포 파이프라인 복구

## 변경 파일

- `apps/web/src/components/PageLayout.tsx` - 공통 레이아웃 컴포넌트
- `apps/web/src/app/page.tsx` - 메인 페이지 콘텐츠 및 AdSense 광고 단위 추가
- `apps/web/src/app/privacy/page.tsx` - 개인정보처리방침
- `apps/web/src/app/terms/page.tsx` - 이용약관
- `apps/web/src/app/contact/page.tsx` - 문의 페이지
- `apps/web/src/components/AdSenseAd.tsx` - 광고 단위 React 컴포넌트
- `apps/web/src/app/layout.tsx` - AdSense 스크립트 `<head>` 주입
- `.github/workflows/deploy-web-vercel.yml` - Vercel 배포 workflow 복구 및 AdSense env 동기화

## 핵심 변경 사항

### 1. 공통 레이아웃 및 법적 필수 페이지

- `PageLayout.tsx`로 헤더, 푸터, 배경을 재사용 가능하게 추출
- `/privacy`, `/terms`, `/contact` 페이지를 한국어로 작성
- 푸터 링크를 실제 페이지로 연결

### 2. 메인 페이지 콘텐츠 보강

- "사용 방법" 단계 섹션 추가(3단계)
- FAQ 아코디언 추가
- CTA 버튼을 `#upload` 앵커 링크로 변경하여 서버 컴포넌트 prerender 오류 해결

### 3. AdSense 연동

- `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-5221391672019535` GitHub variable 등록
- `layout.tsx`에 `<head>`에 직접 `adsbygoogle.js` 스크립트 삽입
- 메인 페이지에 상단 배너, FAQ 인라인 두 개의 AdSense 단위 배치

### 4. Vercel CI/CD 복구

- 기존 workflow가 pnpm spawn 실패로 작동하지 않던 문제 해결
  - `corepack enable && corepack prepare pnpm@8.15.0 --activate`로 pnpm을 글로벌 설치
- `vercel build`에서 `--prebuilt` 단계가 remote build에서는 불필요하여 제거
- Vercel remote build 환경에 `NEXT_PUBLIC_ADSENSE_CLIENT`를 전달하기 위해 `vercel env add` 동기화 step 추가

## 검증

### 로컬 빌드

```powershell
$env:NEXT_PUBLIC_ADSENSE_CLIENT = "ca-pub-5221391672019535"
pnpm --filter web build
```

결과: 성공(`next build` 완료, 7개 static route prerendered).

### GitHub Actions workflow

| Run | Commit | Conclusion | 소요 시간 |
|-----|--------|------------|----------|
| 27857095421 | `44d5b63` feat(web): add AdSense script | success | 1m32s |
| 27857158932 | `e8ab893` trigger redeploy | success | 1m10s |
| 27857209906 | `64bc632` pass env to remote build | success | 1m30s |
| 27857276594 | `fb59e02` beforeInteractive strategy | success | 1m34s |
| 27857372966 | `15903bd` inject script in head | success | 1m49s |
| 27857459557 | `ab4f227` sync env to Vercel | success | 1m56s |

### 프로덕션 HTML 검증

```powershell
$res = Invoke-WebRequest -Uri "https://hwp2pdf-phi.vercel.app" -UseBasicParsing
```

확인 항목:
- HTTP status 200
- `ca-pub-5221391672019535` HTML 내 존재
- `adsbygoogle.js` script src 존재
- `adsbygoogle` push 존재

### 주요 페이지 가용성

- `https://hwp2pdf-phi.vercel.app/privacy` - 200
- `https://hwp2pdf-phi.vercel.app/terms` - 200
- `https://hwp2pdf-phi.vercel.app/contact` - 200

## 남은 작업

- AdSense 대시보드에서 `hwp2pdf-phi.vercel.app` 사이트 추가 및 광고 단위 실제 승인 대기
- 광고 단위(`adSlot`)를 실제 AdSense에서 생성된 값으로 교체(현재는 placeholder 문자열 사용)
- 실제 광고 노출 및 수익 확인

## 참고

- AdSense 스크립트는 Next.js App Router의 `<head>` 직접 삽입 방식으로 SSR HTML에 포함시킴
- Vercel remote build에서는 GitHub Actions runner의 env var가 아닌 Vercel Dashboard/CLI env var만 인식하므로 `vercel env add` 동기화 필요
