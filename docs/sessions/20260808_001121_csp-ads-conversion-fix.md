# CSP 차단으로 인한 변환/광고 실패 수정

## 날짜
2026-08-07

## 문제
프로덕션 사이트(https://hwp2pdf-phi.vercel.app)에서 두 가지 문제 발생:

1. **HWP 변환 실패**: 업로드 시도 시 CSP 위반으로 API 호출 차단
   - `connect-src`에 `https://hwp2pdf-api-130439872251.asia-northeast3.run.app` 누락
   - 브라우저 콘솔: "Refused to connect because it violates the document's Content Security Policy"

2. **AdSense 광고 미노출**: CSP 위반 + 403 오류
   - `connect-src`에 `https://ep1.adtrafficquality.google` (SODAR) 누락
   - `googleads.g.doubleclick.net`에서 403 Forbidden 반환 (AdSense 계정 설정 문제 - 별도)

## 원인 분석
- `apps/web/next.config.ts`의 CSP `connect-src` 디렉티브가 정적으로 작성되어 있었음
- API 도메인이 환경 변수 `NEXT_PUBLIC_API_BASE_URL`로 주입되는데 CSP에 반영되지 않음
- AdSense SODAR 엔드포인트(`ep1.adtrafficquality.google`)가 CSP에 없었음

## 해결
`next.config.ts`의 CSP를 동적 생성으로 변경:
- `buildCsp(apiBaseUrl)` 함수 추가
- `headers()`에서 `process.env.NEXT_PUBLIC_API_BASE_URL`을 읽어 origin 추출 후 `connect-src`에 추가
- `https://ep1.adtrafficquality.google`을 기본 connect-src에 추가

## 변경 파일
- `apps/web/next.config.ts` (54 insertions, 21 deletions)

## 커밋
- `91eff31` fix(web): allow API origin and AdSense SODAR in CSP connect-src

## 검증
- 로컬 typecheck: 통과 (pnpm --filter web exec tsc --noEmit)
- 프로덕션 배포: Vercel 토큰 대기 중 (사용자가 발급 후 배포 필요)

## 남은 작업
1. Vercel 배포 후 브라우저에서 변환 기능 검증
2. AdSense 403 문제는 별도: AdSense 계정에서 도메인 승인 상태 확인 필요
   - hwp2pdf-phi.vercel.app 도메인이 AdSense에 승인되어 있는지 확인
   - robots.txt, ads.txt 설정 확인
