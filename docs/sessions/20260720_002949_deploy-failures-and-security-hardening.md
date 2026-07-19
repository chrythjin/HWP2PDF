# 2026-07-20 세션: 배포 실패 진단 + 보안 하드닝

> 작성일: 2026-07-20 00:29
> 커밋: `2922419`, `b5bb173`
> 범위: GitHub Actions 배포 실패 원인 진단/수정 + `analysis_results.md` 보안 이슈 3건 해결

---

## 1. 시작 배경

사용자가 GitHub Actions 알림 9건을 공유:
- Deploy Web to Vercel #44, #45, #46 실패
- Deploy API to Cloud Run #37, #38, #39, #40, #41, #42 실패

이전 세션(2026-07-19)에서 Dockerfile `pnpm deploy --prod` 복원 작업을 했으나, 그 후속 실패가 연쇄적으로 발생한 상태.

---

## 2. API 배포 실패 원인 진단

### 2-1. 1차 원인: Cloud Tasks worker URL `http://` 위반

**로그 증거**:
```
INVALID_ARGUMENT: HttpRequest.url must start with 'https://' for request with HttpRequest.authorization_header
```

**근거 코드**: `apps/api/src/services/cloud-tasks-dispatcher.ts`
- `createInternalWorkerUrl()`이 `INTERNAL_WORKER_URL` 환경변수가 비어 있으면 `http://localhost:8080/internal/workers/convert`로 fallback
- workflow `.github/workflows/deploy-api-cloud-run.yml`에서 `INTERNAL_WORKER_URL=""` (빈 문자열)로 설정
- Cloud Tasks는 OIDC token이 있는 요청에 `https://` URL을 강제 → `INVALID_ARGUMENT` → `POST /v1/upload`에서 500

**2차 원인**: 로그에 `converter_unavailable` / `Command failed: soffice --version` 기록 — 하지만 Dockerfile에 LibreOffice 설치 단계는 포함되어 있으므로 이미지 rebuild 시 자동 해결됨.

### 2-2. 수정 1: `createInternalWorkerUrl()` Cloud Run 자동 감지 추가

`cloud-tasks-dispatcher.ts`에 `CLOUD_RUN_SERVICE_URLS` env var 기반 자동 감지 로직 추가. Cloud Run이 revision의 public HTTPS URL을 자동으로 주입하므로, `INTERNAL_WORKER_URL`이 비어 있어도 정상 동작.

### 2-3. 수정 2: workflow에서 `INTERNAL_WORKER_URL` 빈 문자열 제거 + 배포 후 URL 주입

`deploy-api-cloud-run.yml`에서 `INTERNAL_WORKER_URL=""` 제거. 배포 후 `gcloud run services describe`로 가져온 실제 서비스 URL을 `INTERNAL_WORKER_URL`과 `INTERNAL_WORKER_AUDIENCE`에 명시 설정하는 새 단계 추가.

---

## 3. Vercel 웹 배포 실패 원인 진단

### 3-1. 원인: pnpm 버전 충돌

- `pnpm/action-setup@v4`에서 `version: 8.15.0` 지정
- `package.json`의 `packageManager: pnpm@8.15.1`과 충돌
- `ERR_PNPM_BAD_PM_VERSION` 에러

이전 세션(2026-07-19)에서 Dockerfile은 `pnpm@8.15.1`로 업데이트했지만 Vercel 워크플로우는 누락됨.

### 3-2. 수정: Vercel 워크플로우 pnpm 버전 통일

`.github/workflows/deploy-web-vercel.yml`의 `version: 8.15.0` → `8.15.1`로 수정.

---

## 4. 첫 번째 커밋/푸시 (배포 실패 수정)

**커밋**: `2922419` - `fix(deploy): Cloud Tasks worker URL https enforcement + pnpm version sync`

변경 파일:
- `apps/api/src/services/cloud-tasks-dispatcher.ts` — Cloud Run 자동 감지 로직
- `.github/workflows/deploy-api-cloud-run.yml` — URL 주입 단계 추가
- `.github/workflows/deploy-web-vercel.yml` — pnpm 8.15.1 통일

검증:
- `pnpm --filter api typecheck`: 통과
- `pnpm --filter api test`: 356/356 통과
- `pnpm -r build`: shared/api/web 모두 성공

---

## 5. 보안 이슈 검토 (`analysis_results.md`)

사용자가 `docs/reviews/analysis_results.md` 확인을 요청. 각 이슈의 현재 코드 상태를 검증:

| # | 이슈 | 심각도 | 상태 |
|---|------|--------|------|
| 3-1 | `.env.local` Git 노출 | Critical | ✅ 안전 — `apps/web/.gitignore:34`에 `.env*` 등록, 커밋 이력 없음 |
| 3-2 | CORS `*` 와일드카드 | Critical | ✅ 안전 — `config.ts:23` 기본값 `localhost:3000` |
| 3-3 | `/v1/jobs/*` rate limit 비활성화 | High | ⚠️ 미해결 — `/download`도 스킵 |
| 3-4 | 내부 에러 메시지 로깅 | High | ⚠️ 미해결 — `error.message` 원본 로깅 |
| 3-5 | 확장자 검사 fragile | Medium | ✅ 안전 — OLE 시그니처 이중 방어 |
| 3-6 | sessionStorage XSS 토큰 탈취 | Medium | ⚠️ 부분 — CSP 미설정 |
| 3-7 | 프론트엔드 CSP 미설정 | Medium | ⚠️ 미해결 — `next.config.ts` 비어있음 |
| 3-8 | `trust proxy: 1` IP 스푸핑 | Medium | ✅ 안전 — Cloud Run 단일 홉 |
| 3-9 | `env.d.ts` 타입 누락 | Low | ✅ 해결 — 이전 세션 적용 |

---

## 6. 보안 이슈 3건 수정

### 6-1. 3-3: download 엔드포인트 rate limit 분리

**파일**: `apps/api/src/app.ts`

변경 전:
```typescript
skip: (request) => {
  const path = request.path;
  return path === "/health" || path.startsWith("/v1/jobs/") || path.startsWith("/internal/");
}
```

변경 후:
```typescript
skip: (request) => {
  const path = request.path;
  if (path === "/health" || path.startsWith("/internal/")) return true;
  if (path.startsWith("/v1/jobs/") && !path.endsWith("/download")) return true;
  return false;
}
```

의도: status 폴링(`GET /v1/jobs/:jobId`)은 스킵 유지(빈번한 폴링), download(`GET /v1/jobs/:jobId/download`)은 rate limit 적용하여 인증 통과 후 남용 차단.

### 6-2. 3-4: error-handler 안전 로깅

**파일**: `apps/api/src/middleware/error-handler.ts`

변경 전:
```typescript
const message = error instanceof Error ? error.message : "Unknown error";
console.error(JSON.stringify({ level: "error", requestId: response.locals.requestId, message }));
```

변경 후:
```typescript
const errorName = error instanceof Error ? error.name : typeof error;
console.error(JSON.stringify({
  level: "error",
  requestId: response.locals.requestId,
  event: "unhandled_error",
  errorName,
}));
```

의도: `error.message` 원본(경로, 스택, GCS 객체 경로 포함 가능)을 Cloud Logging에 노출하지 않음. `requestId`로 운영자가 추적 가능.

### 6-3. 3-7: 프론트엔드 CSP + 보안 헤더

**파일**: `apps/web/next.config.ts`

변경 전: 빈 `nextConfig`

변경 후: `headers()` 추가 — CSP + 4개 보안 헤더:
- `Content-Security-Policy`: AdSense(`pagead2.googlesyndication.com`, `googleads.g.doubleclick.net`), Firebase(`*.googleapis.com`, `gstatic.com`), Google Fonts(`fonts.googleapis.com`, `fonts.gstatic.com`) 허용
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

의도: 3-6(sessionStorage XSS)도 CSP `script-src` 제한으로 자연스럽게 보강됨.

---

## 7. 두 번째 커밋/푸시 (보안 하드닝)

**커밋**: `b5bb173` - `security: rate limit download, safe error logging, frontend CSP headers`

변경 파일 3개 (78 insertions, 17 deletions):
- `apps/api/src/app.ts`
- `apps/api/src/middleware/error-handler.ts`
- `apps/web/next.config.ts`

검증:
- `pnpm -r build`: 3 패키지 빌드 성공
- `pnpm --filter api typecheck`: 통과
- `pnpm --filter api test`: 356/356 통과 (18 파일)
- `pnpm -r lint`: 통과
- Web build: 12 페이지 정적 생성 성공

---

## 8. 관련 문서 검토 결과

### 8-1. `docs/plan/20260719_hwp-ads-fix-plan.md` (HWP 변환 + AdSense 수정 계획서)

7/7 Fix 모두 적용 완료 확인:
- Fix 1-1: Dockerfile warm-up 경고 로그
- Fix 1-2: H2Orestart 설치 검증 gate
- Fix 1-3: `libreoffice_exit_nonzero` 진단 이벤트
- Fix 1-4: 서버 startup 변환 엔진 체크
- Fix 2-1: 실제 AdSense 슬롯 ID(1321652658/2224239001)
- Fix 2-2: `<Script>` (next/script) 교체
- Fix 2-3: `env.d.ts` 타입 선언 추가

### 8-2. `docs/reviews/20260712_code-and-frontend-improvement-report.md` (코드·프론트엔드 개선 보고서)

12개 항목 중:
- **완료 9건**: P0 #1(stuck 작업 복구), P0 #2(오류 메시지 노출), P0 #3(이력 조회 실패), P0 #4(다운로드 가능 상태), P1 #5(Firestore 인덱스), P1 #7(모바일 내비게이션), P1 #8(a11y 상태 전달), P1 #9(게시판 필터 a11y), P2 #10(ConfirmationDialog)
- **부분 2건**: P2 #11(파일명 우선 표시), P2 #12(클라이언트 공통 hook)
- **미해결 1건**: P1 #6(converter 서비스 분리) — 외부 의사결정 블로커(T10 ADR 승인 대기)

### 8-3. `docs/reviews/analysis_results.md` (코드 분석 결과 보고서)

기능 이슈(1-1 ~ 2-4)는 모두 정상/해결 상태. 보안 이슈 9건 중 6건은 이미 안전, 3건은 이번 세션에서 해결.

---

## 9. 남은 항목

- **P1 #6 (converter 서비스 분리)**: T10 ADR 승인 게이트가 통과되어야 착수 가능 (project memory #716)
- **P2 #11 (파일명 우선 표시)**: `JobHistoryList.tsx`에 `fileName` 표시는 있으나 `jobId`가 여전히 주요 제목일 수 있음
- **P2 #12 (클라이언트 공통 hook)**: `fetchWithAuth`/`ApiClientError`는 있으나 페이지별 `loading/success/empty/error` 통일 hook 미도입

이 3건은 별도 작업 범위이므로 이번 세션에서는 다루지 않음.

---

## 10. 커밋 목록

| 커밋 | 메시지 |
|------|--------|
| `2922419` | fix(deploy): Cloud Tasks worker URL https enforcement + pnpm version sync |
| `b5bb173` | security: rate limit download, safe error logging, frontend CSP headers |