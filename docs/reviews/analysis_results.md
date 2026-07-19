# HWP2PDF 코드 분석 결과 보고서

> 분석 일시: 2026-07-19  
> 대상: `apps/web`, `apps/api`, `packages/shared` 전체 코드베이스

---

## 1. HWP 변환이 실제로 작동하지 않는 이유

### 🔴 1-1. LibreOffice가 로컬/Windows에 없음 (근본 원인)

[conversion-service.ts](file:///c:/NEW%20PRG/HWP2PDF/apps/api/src/services/conversion-service.ts) 에서 `soffice` 바이너리를 직접 `spawn`합니다:

```typescript
// config.ts line 26
converterCommand: process.env.LIBREOFFICE_BIN ?? "soffice",
```

- Windows 로컬 환경에서는 LibreOffice가 설치되어 있지 않으면 `ENOENT` 에러 → `converter_unavailable` 실패
- [Dockerfile](file:///c:/NEW%20PRG/HWP2PDF/apps/api/Dockerfile)에서만 LibreOffice + H2Orestart 확장 + 한국어 폰트를 설치
- **로컬 개발 시에는 Docker 없이는 변환이 불가능**

### 🔴 1-2. GCS 미구성 시 Direct Upload 409 fallback 경로 문제

[v1.ts L151-153](file:///c:/NEW%20PRG/HWP2PDF/apps/api/src/routes/v1.ts#L151-L153):
```typescript
if (!shouldUseGcs()) {
  next(new ApiError(409, "direct_upload_unavailable", ...));
  return;
}
```

- 프론트엔드는 먼저 `POST /v1/uploads/initiate` (Direct Upload)를 시도
- 로컬 모드(`STORAGE_BACKEND=local`)에서는 **409**를 반환하고 → 클라이언트가 `uploadViaMultipart` fallback으로 전환
- 이 fallback 자체는 코드상 정상 동작하지만, **최종적으로 LibreOffice가 없어서 변환 실패**

### 🟡 1-3. `.hwp` 전용 제한 (HWPX 미지원)

[shared/index.ts L349](file:///c:/NEW%20PRG/HWP2PDF/packages/shared/src/index.ts#L349):
```typescript
export const ALLOWED_EXTENSIONS = [".hwp"];
```

- `.hwpx` (HWPML, 최신 한글 포맷)는 완전히 차단됨
- [upload.ts L41](file:///c:/NEW%20PRG/HWP2PDF/apps/api/src/middleware/upload.ts#L41): OLE compound document 시그니처 검증은 `.hwp` 전용 (HWPX는 ZIP 기반이라 다른 매직바이트)

> **결론**: HWP 변환이 안 되는 이유는 **Windows 로컬에 LibreOffice가 설치되지 않았기 때문**. Docker 이미지를 빌드하고 컨테이너에서 API를 실행하면 동작합니다.

---

## 2. 광고(AdSense)가 표시되지 않는 이유

### 🔴 2-1. AdSense 스크립트는 로드되지만 광고가 표시 안 됨

[layout.tsx L36-42](file:///c:/NEW%20PRG/HWP2PDF/apps/web/src/app/layout.tsx#L36-L42):
```tsx
{ADSENSE_CLIENT && (
  <script
    async
    src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    crossOrigin="anonymous"
  />
)}
```

- `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-5221391672019535` 가 `.env.local`에 설정되어 있으므로 **스크립트 자체는 로드됨**

### 🔴 2-2. `adSlot` 값이 실제 AdSense 슬롯 ID가 아닌 임의 문자열

[page.tsx L62](file:///c:/NEW%20PRG/HWP2PDF/apps/web/src/app/page.tsx#L62):
```tsx
<AdSenseAd adSlot="hwp2pdf-top-banner" ... />
<AdSenseAd adSlot="hwp2pdf-faq-inline" ... />
```

- `data-ad-slot`에 `"hwp2pdf-top-banner"`, `"hwp2pdf-faq-inline"` 같은 **영문 문자열**이 들어감
- **AdSense 광고 슬롯 ID는 숫자 문자열** (예: `"1234567890"`)
- 잘못된 슬롯 ID → AdSense SDK가 해당 광고 유닛을 찾을 수 없어 **아무것도 렌더링 안 됨**

### 🟡 2-3. Next.js SSR에서 `<script>` 직접 삽입 문제

- Next.js에서는 `<Script>` 컴포넌트(`next/script`)를 사용해야 서드파티 스크립트 로딩이 정확히 동작
- 현재 `<script>` 태그를 `<head>` 안에 직접 넣고 있어, SSR/hydration 불일치 또는 로딩 타이밍 문제 발생 가능

### 🟡 2-4. localhost에서는 AdSense 미동작

- AdSense는 승인된 도메인에서만 광고를 제공. `localhost:3000`에서는 광고가 표시되지 않는 것이 정상

> **결론**: 광고가 안 나오는 주 원인은 **`adSlot`이 실제 AdSense 숫자 슬롯 ID가 아니라 임의 문자열**이기 때문. AdSense 콘솔에서 실제 슬롯 ID를 생성하고 교체해야 합니다.

---

## 3. 보안 이슈 분석

### 🔴 [CRITICAL] 3-1. Firebase API Key가 `.env.local`에 하드코딩되어 Git 추적 가능

[.env.local](file:///c:/NEW%20PRG/HWP2PDF/apps/web/.env.local):
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAaZw6Z7YTkxzEeFJ6-yGEAHmhZ0K4qp8Q
NEXT_PUBLIC_FIREBASE_APP_ID=1:130439872251:web:154ccd66e2803668607a5e
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-5221391672019535
```

- `.env.local`이 `.gitignore`에 포함되어 있는지 확인 필요
- Firebase의 `NEXT_PUBLIC_*` 키들은 클라이언트 공개 키이지만, **AdSense 클라이언트 ID와 함께 노출되면 남용 가능성**

> [!WARNING]
> `.env.local`이 Git에 커밋되면 Firebase API Key, Project ID, AdSense Client ID가 모두 공개 저장소에 노출됩니다.

### 🔴 [CRITICAL] 3-2. CORS origin이 `*` 와일드카드로 풀릴 가능성

[config.ts L23](file:///c:/NEW%20PRG/HWP2PDF/apps/api/src/config.ts#L23):
```typescript
corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
```

- 로컬 기본값은 `http://localhost:3000`으로 안전
- 하지만 프로덕션에서 `CORS_ORIGIN=*`으로 설정하면 **모든 도메인에서 API 호출 가능** → CSRF 공격 벡터

### 🔴 [HIGH] 3-3. Rate Limiting이 특정 경로에서 완전히 비활성화

[app.ts L44-48](file:///c:/NEW%20PRG/HWP2PDF/apps/api/src/app.ts#L44-L48):
```typescript
skip: (request) => {
  const path = request.path;
  return path === "/health" || path.startsWith("/v1/jobs/") || path.startsWith("/internal/");
},
```

- `/v1/jobs/*` 경로의 rate limiting이 **완전히 스킵**됨
- 이유: 폴링을 위해 빈번한 요청이 필요하지만, **download 엔드포인트도 `/v1/jobs/:jobId/download`**이므로 rate limit 없이 무한 다운로드 요청 가능
- `/internal/*` 경로도 스킵되어 있어 Cloud Tasks 외부에서의 무차별 대입 시도에 무방비 (OIDC 인증은 있지만 rate limit은 없음)

### 🔴 [HIGH] 3-4. 에러 핸들러가 내부 Error 메시지를 그대로 로깅

[error-handler.ts L14](file:///c:/NEW%20PRG/HWP2PDF/apps/api/src/middleware/error-handler.ts#L14):
```typescript
const message = error instanceof Error ? error.message : "Unknown error";
console.error(JSON.stringify({ level: "error", requestId: response.locals.requestId, message }));
```

- 내부 에러 메시지(스택 트레이스, 파일 경로, GCS 객체 경로 등)가 **서버 로그에 그대로 출력**
- Cloud Run 환경에서 이러한 로그가 Cloud Logging에 저장되어 잠재적 정보 노출

### 🟡 [MEDIUM] 3-5. `validateFileExtension`의 확장자 검사 우회 가능

[shared/index.ts L360](file:///c:/NEW%20PRG/HWP2PDF/packages/shared/src/index.ts#L360):
```typescript
const extension = fileName.toLowerCase().slice(-4);
if (!ALLOWED_EXTENSIONS.includes(extension)) { ... }
```

- `.hwp`는 4글자이므로 `slice(-4)` 동작하지만, 만약 다른 확장자를 추가한다면 (예: `.hwpx` 5글자) 검사 로직이 깨짐
- 이중 확장자 (`file.hwp.exe`) 공격 벡터: `"file.hwp.exe".slice(-4)` = `".exe"` → 차단됨 ✅
- 하지만 `"file.test.hwp"` = `".hwp"` → 통과 → OLE 시그니처 검사에서 추가 방어 ✅
- **OLE 시그니처 검사가 서버에서 추가 방어하므로 현재는 안전하지만, 확장자 파싱 로직이 fragile**

### 🟡 [MEDIUM] 3-6. 익명 토큰이 sessionStorage에 저장

[upload-token.ts L31](file:///c:/NEW%20PRG/HWP2PDF/apps/web/src/lib/upload-token.ts#L31):
```typescript
window.sessionStorage.setItem(buildJobTokenStorageKey(jobId), accessToken);
```

- sessionStorage는 탭 스코프이므로 적절하지만, **XSS 공격에 취약** (JavaScript로 직접 읽기 가능)
- CSP(Content Security Policy)가 설정되어 있지 않음 — helmet의 기본 CSP가 적용되지만 커스텀 설정이 없음

### 🟡 [MEDIUM] 3-7. Helmet 기본 설정만 사용 — 커스텀 CSP 없음

[app.ts L29](file:///c:/NEW%20PRG/HWP2PDF/apps/api/src/app.ts#L29):
```typescript
app.use(helmet());
```

- Helmet 기본 설정은 기본 보안 헤더를 추가하지만, **AdSense 스크립트를 위한 CSP 설정이 없음**
- AdSense 스크립트가 `pagead2.googlesyndication.com`에서 로드되므로 적절한 `script-src` CSP가 필요
- API 서버에 Helmet이 설정되어 있지만, **프론트엔드(Next.js)에는 보안 헤더 설정이 전혀 없음**

### 🟡 [MEDIUM] 3-8. `trust proxy` 프로덕션 설정의 잠재적 IP 스푸핑

[app.ts L24-26](file:///c:/NEW%20PRG/HWP2PDF/apps/api/src/app.ts#L24-L26):
```typescript
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
```

- `trust proxy: 1`은 한 홉의 프록시만 신뢰 (Cloud Run에 적합)
- 그러나 여러 프록시 체인이 있는 환경에서는 `X-Forwarded-For` 스푸핑 가능 → 잘못된 IP 기반 rate limiting

### 🟢 [LOW] 3-9. `env.d.ts`에 `NEXT_PUBLIC_ADSENSE_CLIENT` 타입 선언 누락

[env.d.ts](file:///c:/NEW%20PRG/HWP2PDF/apps/web/src/env.d.ts):
- `NEXT_PUBLIC_ADSENSE_CLIENT`가 타입 선언에 없음 → TypeScript가 해당 환경변수를 인식하지 못함
- 기능적 문제는 아니지만 타입 안전성 저하

---

## 요약 테이블

| # | 이슈 | 심각도 | 카테고리 | 상태 |
|---|------|--------|----------|------|
| 1-1 | LibreOffice 미설치 (로컬) | 🔴 Critical | HWP 변환 | Docker 빌드 필요 |
| 1-2 | Direct Upload 409 fallback | 🟢 Info | HWP 변환 | 정상 동작 |
| 1-3 | HWPX 미지원 | 🟡 Medium | HWP 변환 | 의도된 제한 |
| 2-1 | AdSense 스크립트 로드 | 🟢 OK | 광고 | 정상 |
| 2-2 | **adSlot이 가짜 문자열** | 🔴 Critical | 광고 | **수정 필요** |
| 2-3 | `<script>` 대신 `<Script>` 사용 권장 | 🟡 Medium | 광고 | 개선 권장 |
| 2-4 | localhost에서 AdSense 미동작 | 🟢 Info | 광고 | 정상 |
| 3-1 | `.env.local` Git 노출 가능성 | 🔴 Critical | 보안 | 확인 필요 |
| 3-2 | CORS `*` 와일드카드 가능성 | 🔴 High | 보안 | 프로덕션 확인 |
| 3-3 | `/v1/jobs/*` rate limit 비활성화 | 🔴 High | 보안 | **수정 필요** |
| 3-4 | 내부 에러 메시지 로깅 | 🔴 High | 보안 | 개선 필요 |
| 3-5 | 확장자 검사 fragile 로직 | 🟡 Medium | 보안 | OLE 검사로 방어됨 |
| 3-6 | XSS시 sessionStorage 토큰 탈취 | 🟡 Medium | 보안 | CSP 설정 필요 |
| 3-7 | CSP 미설정 (프론트엔드) | 🟡 Medium | 보안 | **수정 필요** |
| 3-8 | IP 스푸핑 가능성 | 🟡 Medium | 보안 | Cloud Run에서는 안전 |
| 3-9 | env.d.ts 타입 누락 | 🟢 Low | 타입 | 개선 권장 |

---

## 즉시 조치 필요 항목 (Top 3)

1. **AdSense 광고 슬롯 ID를 실제 숫자 ID로 교체** — Google AdSense 콘솔에서 광고 유닛을 생성하고, 반환된 숫자 슬롯 ID로 `page.tsx`의 `adSlot` props 교체
2. **로컬 HWP 변환을 위해 Docker 컨테이너에서 API 서비스 실행** — `docker build -f apps/api/Dockerfile .` 후 컨테이너에서 API 실행
3. **`/v1/jobs/:jobId/download` 경로에 rate limiting 적용** — status 폴링용 GET과 download GET을 분리하여 download에만 rate limit 유지

---

## `.gitignore` 확인 필요

`.env.local`이 Git 히스토리에 커밋되었는지 확인이 필요합니다. 아래 명령어로 확인해 주세요:

```bash
git log --oneline --all -- "apps/web/.env.local"
```

이미 커밋된 이력이 있다면 **Firebase API Key를 즉시 순환(rotate)** 해야 합니다.
