# HWP2PDF 서비스 제작 청사진 /blueprint

> **프로젝트명**: HWP2PDF  
> **최종 갱신**: 2026-06-10  
> **목적**: Allinpdf 웹사이트처럼 직관적이고 단순명료한 UX를 제공하는 HWP→PDF 변환 서비스 설계

---

## 1. 한 줄 결론: 추천 아키텍처

**프론트는 Next.js(Vercel)로 단순 업로드 UX 제공 → 실제 문서 변환은 Cloud Run 전용 API/Worker가 담당 → 파일은 GCS 임시 버킷에 저장 → 다운로드는 짧은 TTL Signed URL 또는 프록시 다운로드 방식 사용 → 30분 자동 삭제는 GCS Lifecycle Rule로 강제 → Rate limiting은 API Gateway/Cloud Armor 또는 Redis 기반으로 별도 제어**

이 구조가 좋은 이유:
- **Vercel에 무거운 문서 변환 책임을 안 싣는다**
- LibreOffice 같은 무거운 바이너리는 **Cloud Run 컨테이너**에 격리
- 임시파일 삭제를 앱 로직이 아니라 **스토리지 정책 자체로 보장**
- 프론트/백 분리로 장애 원인 분리가 쉬움
- 나중에 한컴 API로 바꾸더라도 프론트는 거의 안 바뀜

---

## 2. 먼저 보강해야 할 요구사항

### 2.1 변환 방식 우선순위 명시

현재는 LibreOffice Headless CLI 또는 한컴 API 두 가지가 섞여 있습니다. 초기에 명확히 해야 합니다.

**추천:**
- **1차 MVP**: LibreOffice 기반 (H2Orestart 확장 포함)
- **2차 옵션**: 한컴 API 어댑터 추가

**이유:**
- 구현 주도권이 내 쪽에 있음
- API 공급자 장애/정책 변경 영향이 적음
- 다만 **HWP 렌더링 품질**은 실제 샘플 검증이 필요함

> ⚠️ **중요**: HWP → PDF 품질은 실제 샘플셋 검증 후 확정한다. LibreOffice 품질이 서비스 기준에 미달하면 한컴 API 또는 별도 상용 엔진을 대체 전략으로 둔다.

HWP는 DOCX/PDF보다 훨씬 까다로운 포맷이라, **기술적으로 변환이 '된다ropolis'와 서비스 품질이 '충분하다'는 다른 문제**입니다.

### 2.2 처리 방식: 동기 vs 비동기

**추천: 비동기 Job 모델**

1. 업로드 → 2. Job 생성 → 3. 변환 진행 → 4. 프론트가 상태 polling → 5. 완료되면 다운로드 제공

- 장점: 서버리스에 더 안정적
- 장점: 진행 상태 표시가 자연스러움
- 장점: 재시도/실패 관리 쉬움
- 단점: 구조가 약간 늘어남

### 2.3 파일 크기/형식 제한

- 허용 형식: `.hwp`, `.hwpx` (政府 권장 XML 포맷)
- 최대 파일 크기: 20MB (MVP), 50MB (운영 확장)
- 동시 업로드 수: 1개 우선
- 압축 파일, 실행 파일, 다중 확장자 파일 차단
- MIME + 확장자 + magic number 가능한 범위 내 검증

### 2.4 보안 요구사항 보강

- 업로드 파일명 그대로 저장하지 않기 → UUID 기반 object key 사용
- GCS 버킷 public access 금지
- 다운로드 링크는 **짧은 TTL signed URL** 사용
- 컨테이너 내부 `/tmp` 파일도 변환 직후 즉시 삭제
- 로그에 원본 파일명/민감 경로 최소화
- 악성 파일 업로드 대비: 파일 크기 제한, 확장자 제한, 처리 시간 제한, LibreOffice 실행 권한 최소화, 컨테이너 비root 실행

### 2.5 운영 요구사항 추가

- 실패율 모니터링
- 평균 변환 시간
- timeout 기준
- 재시도 정책
- 에러 코드 표준화
- 장애 시 사용자 메시지
- 일일/시간당 비용 가드레일
- Cloud Run max instances 제한

---

## 3. 추천 시스템 구성도

```
[User Browser]
   |
   v
[Next.js Frontend on Vercel]
   |
   | 1) 업로드 요청 (presigned URL 발급)
   v
[API Layer / Job API on Cloud Run]
   |
   | 2) 원본 파일 검증
   | 3) GCS 업로드
   | 4) Job 생성
   v
[GCS Temp Bucket] <----> [Cloud Run Converter Worker]
   |                           |
   |                           | 5) LibreOffice headless 변환
   |                           | 6) 결과 PDF 업로드
   v                           v
[Original HWP]             [Result PDF]
   |
   | 7) Signed URL 발급 or proxy download
   v
[Frontend Download]
```

---

## 4. 추천 프로젝트 폴더 구조(Tree)

**프론트와 백을 모노레포로 관리**하는 걸 추천합니다.

```
hwp2pdf/
├─ apps/
│  ├─ web/                               # Next.js frontend (Vercel)
│  │  ├─ app/
│  │  │  ├─ layout.tsx
│  │  │  ├─ page.tsx                     # 메인 업로드 페이지
│  │  │  ├─ result/[jobId]/page.tsx      # 변환 결과/상태 페이지
│  │  │  └─ api/
│  │  │     └─ health/route.ts           # 프론트 상태 확인용 경량 API
│  │  ├─ components/
│  │  │  ├─ upload/
│  │  │  │  ├─ DropzoneUploader.tsx
│  │  │  │  ├─ UploadProgress.tsx
│  │  │  │  ├─ FilePreview.tsx
│  │  │  │  └─ StatusBadge.tsx
│  │  │  ├─ layout/
│  │  │  │  ├─ Header.tsx
│  │  │  │  └─ Footer.tsx
│  │  │  └─ common/
│  │  │     ├─ Button.tsx
│  │  │     └─ Card.tsx
│  │  ├─ lib/
│  │  │  ├─ api-client.ts                # Cloud Run API 호출
│  │  │  ├─ validators.ts                # 파일 크기/확장자 검증
│  │  │  └─ constants.ts
│  │  ├─ hooks/
│  │  │  ├─ useUpload.ts
│  │  │  └─ useJobStatus.ts
│  │  ├─ styles/
│  │  │  └─ globals.css
│  │  ├─ public/
│  │  ├─ tailwind.config.ts
│  │  ├─ next.config.ts
│  │  ├─ package.json
│  │  └─ .env.local
│  │
│  └─ api/                               # Cloud Run backend
│     ├─ src/
│     │  ├─ app.ts                       # Express app
│     │  ├─ server.ts                    # entrypoint
│     │  ├─ routes/
│     │  │  ├─ upload.route.ts           # 업로드/Job 생성
│     │  │  ├─ jobs.route.ts             # 상태 조회
│     │  │  ├─ download.route.ts         # signed URL or proxy
│     │  │  └─ health.route.ts
│     │  ├─ controllers/
│     │  │  ├─ upload.controller.ts
│     │  │  ├─ jobs.controller.ts
│     │  │  └─ download.controller.ts
│     │  ├─ services/
│     │  │  ├─ gcs.service.ts            # GCS 업로드/다운로드/Signed URL
│     │  │  ├─ convert.service.ts        # LibreOffice 변환
│     │  │  ├─ job.service.ts            # Job 생성/상태 관리
│     │  │  ├─ rate-limit.service.ts     # Redis/메모리/게이트웨이 연동
│     │  │  └─ cleanup.service.ts        # 로컬 tmp 정리
│     │  ├─ middleware/
│     │  │  ├─ upload.middleware.ts      # multer/busboy
│     │  │  ├─ error.middleware.ts
│     │  │  ├─ rate-limit.middleware.ts
│     │  │  └─ request-id.middleware.ts
│     │  ├─ lib/
│     │  │  ├─ logger.ts
│     │  │  ├─ env.ts
│     │  │  └─ errors.ts
│     │  ├─ utils/
│     │  │  ├─ file.ts
│     │  │  ├─ mime.ts
│     │  │  ├─ path.ts
│     │  │  └─ shell.ts
│     │  └─ types/
│     │     └─ job.ts
│     ├─ Dockerfile
│     ├─ package.json
│     ├─ tsconfig.json
│     └─ .env
│
├─ packages/
│  ├─ shared/
│  │  ├─ src/
│  │  │  ├─ api-types.ts                 # 프론트/백 공용 타입
│  │  │  ├─ job-status.ts
│  │  │  └─ validation.ts
│  │  ├─ package.json
│  │  └─ tsconfig.json
│
├─ infrastructure/
│  ├─ gcp/
│  │  ├─ cloud-run.yaml
│  │  ├─ bucket-lifecycle.json
│  │  ├─ service-accounts.md
│  │  └─ cloud-armor-or-apigw.md
│  ├─ vercel/
│  │  └─ project-settings.md
│  └─ docker/
│     └─ libreoffice.Dockerfile
│
├─ .github/
│  └─ workflows/
│     ├─ web-deploy.yml
│     ├─ api-deploy.yml
│     └─ ci.yml
│
├─ docs/
│  ├─ architecture/
│  │  ├─ system-overview.md
│  │  ├─ security.md
│  │  ├─ storage-lifecycle.md
│  │  └─ rate-limiting.md
│  ├─ api/
│  │  └─ openapi.yaml
│  └─ operations/
│     ├─ runbook.md
│     └─ incident-handling.md
│
├─ .env.example
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json                           # 선택
└─ README.md
```

---

## 5. 사용자 흐름 청사진

### 기본 UX 흐름

1. 사용자가 메인 페이지 진입
2. 중앙 Dropzone에 HWP 파일 드래그 앤 드롭
3. 프론트에서 1차 검증 (확장자, 파일 크기)
4. 업로드 시작
5. 서버가 Job 생성
6. UI에서 상태 표시 (업로드 중 → 변환 대기 → 변환 중 → 완료 / 실패)
7. 완료 시 다운로드 버튼 표시
8. 30분 이후 자동 삭제

### 추천 상태값

- `idle`
- `uploading`
- `queued`
- `processing`
- `completed`
- `failed`
- `expired`

---

## 6. 검증된 핵심 사실 (Verified Facts)

### 6.1 HWP→PDF 변환 엔진 선택이 최대 기술 리스크

- **LibreOffice 기본 HWP 필터는 HWP v3.0만 지원**하고, v5.0(2010년 출시, 현재 주류)은 **silent corruption** 버그가 공식 문서화돼 있음 ([docs.libreoffice.org/hwpfilter.html](https://docs.libreoffice.org/hwpfilter.html) — `tdf#70097`)
- **H2Orestart 확장**(ebandal/H2Orestart, GPL-3.0, 180★, 2026-04 v0.7.12 릴리즈)이 HWP v5.0 + HWPX 실제 운영 솔루션 — `unopkg add --shared`로 설치, `--infilter="Hwp2002_File"`로 호출
  - 출처: [extensions.libreoffice.org/.../27504](https://extensions.libreoffice.org/en/extensions/show/27504)
  - 운영 사례: [velog.io/@shyim/hwp-to-pdf-in-LINUX](https://velog.io/@shyim/hwp-to-pdf-in-LINUX), [heum-story.tistory.com/298](https://heum-story.tistory.com/298)
- **반드시 한글 폰트 동시 설치 필요**: `fonts-nanum`, `fonts-noto-cjk`, `fonts-unfonts-core`
- HWPX(2014+, 정부 권장 XML 포맷)는 LibreOffice + H2Orestart로 "Excellent(⭐⭐⭐⭐)" 보존 품질 보고됨 ([chaeya/airun-hwp README](https://github.com/chaeya/airun-hwp))
- 대안 라이브러리 (Node.js, 모두 활발히 업데이트 중):
  - **[@ohah/hwpjs](https://registry.npmjs.org/@ohah/hwpjs)** — Rust 코어, `toPdf()` 직접 제공, HWP 5.0 + HWPX, Node 18+
  - **[@ssabrojs/hwpxjs](https://registry.npmjs.org/@ssabrojs/hwpxjs)** — HWP 5.0 읽기 + HWPX ↔ MD/HTML 양방향, PDF는 별도 단계 필요
  - **[@handoc/pdf-export](https://github.com/muin-company/handoc)** — HTML → PDF (Playwright 기반)
  - **Aspose.PDF for Node.js** — 상용, WASM (170MB+)

### 6.2 Vercel 함수 본문 크기 제한이 HWP 업로드 직접 처리 불가능

- **Hobby: 4.5MB, Pro: 6MB** 페이로드 ([vercel.com/docs/functions/limitations](https://vercel.com/docs/functions/limitations))
- HWP 파일은 이미지 포함 시 **수십~수백 MB가 흔함** → 직접 업로드 불가
- Server Actions 기본 1MB, `serverActions.bodySizeLimit`로 10~25MB까지 가능
- **공식 권장: presigned URL로 브라우저→GCS 직접 업로드** (Vercel 본문 우회)

### 6.3 Cloud Run + LibreOffice는 콜드 스타트가 결정적 병목

- **LibreOffice는 매 요청마다 시작→로드→종료** (stateless 모드) → Cloud Run에서 60초+ 지연 사례 보고
- 권장 메모리: **최소 2GiB** (90MB DOCX가 2GB+ 사용한 Gotenberg 사례 존재)
- 해결책: **리스너 모드** — `unoserver` (Python) 또는 **Gotenberg** (Go, Cloud Run 전용 이미지 제공)
  - 리스너 모드는 CPU 부하 50~75% 감소, 처리량 2~4배
  - **Gotenberg 주의**: `--uno-listener-restart-threshold=0`로 stateless 폴백 필요 (Cloud Run 헬스체크 이슈)
- **LibreOffice 7.6.4+ 회귀**: 특정 DOCX에서 100% CPU + 타임아웃
- 컨테이너 디스크는 **in-memory tmpfs** → 디스크 쓰기가 메모리 소비 → 정리 안 하면 OOM
- min-instances=1: **메모리만 과금 시 약 $3.24/월**
- **Startup CPU Boost**로 콜드 스타트 단축 가능 (요청 후 10초까지 CPU 2배)

### 6.4 GCS Lifecycle 규칙은 비동기(일 1회) + 최대 24h 지연

- `age` 조건 + `Delete` 액션, 또는 `AbortIncompleteMultipartUpload` (놓치기 쉬움, 비용 누수)
- `SetStorageClass`는 Nearline(30일)/Coldline(90일)/Archive(365일) 최소 보관 → 조기 삭제 시에도 최소 요금 부과
- 임시 버킷 권장 패턴: `matchesPrefix: ["uploads/tmp/"]` + `age: 1`

### 6.5 Vercel → Cloud Run 인증

- **Vercel OIDC Federation** 권장 (장기 credential 불요) — `VERCEL_OIDC_TOKEN` + Google Workload Identity Federation
- 대안: Google-signed OIDC ID Token (`Authorization: Bearer`) + 호출 측 SA에 `roles/run.invoker` 부여, audience는 **Cloud Run URL 정확히 일치**

### 6.6 Rate Limiting: 메모리 방식은 서버리스에서 무조건 실패

- 각 함수가 독립 메모리 + 다중 인스턴스 + 멀티 리전 → 사용자 한 명이 한도 2배 사용 가능
- 권장: **Upstash Ratelimit + Upstash Redis** (HTTP API, 영구 연결 불요) 또는 **Vercel KV** (같은 엔진)
- 알고리즘: 일반=sliding window, AI/고비용=token bucket, 인증 endpoint=5/분 같은 엄격한 한도
- **Middleware 단계 적용** → 거절된 요청이 함수 호출 안 됨 → 비용 절감
- 429 응답 헤더 3종 권장: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`

---

## 7. 아키텍처 트레이드오프 (Architecture Tradeoffs)

| 결정 포인트 | 옵션 A | 옵션 B | 고려사항 |
|---|---|---|---|
| **변환 엔진** | LibreOffice + H2Orestart (무료, GPL-3.0, v5.0/HWPX) | 상용 (한컴뷰어, Aspose) — GPL 회피, 호환성 ↑ | 비용 vs 라이선스 vs 호환성. 공공/기업용이면 상용 검토 |
| **Cloud Run 운영 모드** | Stateless `libreoffice --headless` (단순) | **Gotenberg 리스너 모드** (2~4배 빠름) | Gotenberg는 Cloud Run에서 헬스체크 이슈 있음 — `--uno-listener-restart-threshold=0` 또는 자체 리스너 |
| **업로드 경로** | Vercel Route Handler 통과 (≤4.5MB만) | **GCS V4 Signed URL 직접 PUT** (권장) | 거의 모든 HWP가 4.5MB 초과하므로 B가 사실상 필수 |
| **콜드 스타트 대응** | min-instances=0 (저렴, 느림) | **min-instances=1+ Startup CPU Boost** (~$3.24/월) | UX 요구치에 따라 결정. HWP 변환은 10~30s 걸릴 수 있음 |
| **동시성** | Cloud Run concurrency 1 (단순) | 2~4 (메모리 2~4GiB 필요) | LibreOffice는 단일 프로세스 점유 — 동시성 ↑이면 메모리 ↑ |
| **PDF 전달** | 변환된 PDF를 GCS에 저장 + 서명 URL | 응답으로 직접 stream | 큰 PDF는 stream, 작은 PDF는 GCS 경유 재사용 |
| **Rate Limit 위치** | Vercel 미들웨어 (빠름, 비용 ↓) | Cloud Run 인입 (정확) | 양쪽 적용 권장 (이중 방어) |
| **인증 토큰** | Vercel OIDC Federation | Service Account 키 파일 | OIDC가 보안/유지보수 우수 |

---

## 8. 운영 리스크 (Operational Risks)

### 🔴 높음

1. **변환 실패율**: H2Orestart는 커뮤니티 확장으로, HWP v5.0 복잡 문서(표, 도형, 매크로, OLE 객체)에서 깨질 수 있음 — **fallback 경로 필수**
2. **콜드 스타트 + 변환 시간 = 사용자 체감 30~60초**: 비동기 잡 큐 (Cloud Tasks / Pub/Sub) + 폴링/웹훅으로 UX 분리 필요
3. **메모리 OOM**: 큰 HWP + 임베디드 이미지 → 2GB 초과 가능, Cloud Run 인스턴스 강제 종료
4. **GCS 비용 누수**: `AbortIncompleteMultipartUpload` 미설정 시 실패한 업로드 과금

### 🟡 중간

5. **Vercel 단일 리전 (기본 `iad1`)**: 한국 사용자 체감 지연 → Pro/Ent에서 리전 선택 필요
6. **Cloud Run max-instances=0 기본**: 동시 다발 요청 시 인스턴스 생성 경합 — 명시적 상한 필요
7. **Vercel maxDuration**: Pro 800s로 올려도 변환 + 콜드 스타트 합쳐서 빠듯할 수 있음
8. **LibreOffice 버전 핀**: 7.6.4+ 회귀 존재 → 베이스 이미지 버전 명시적 고정
9. **Cloud Run → GCS**: 같은 VPC가 아니면 egress 비용 발생 (same-region이라도 소액)

### 🟢 낮음

10. **GCS lifecycle 24h 지연**: 비용 영향 미미, 단 정책 검증 시 시간 여유 필요
11. **HWPX (ZIP+XML) 입력 검증**: 악성 zip → `application/zip` MIME 스니핑으로 차단 가능

---

## 9. 도입 전 확정해야 할 항목 (Blueprint Checklist)

### A. 변환 파이프라인 결정
- [ ] **엔진 선택**: LibreOffice+H2Orestart (GPL-3.0 OK?) vs 상용 (한컴/Aspose)?
- [ ] **HWP v3.0 / v5.0 / HWPX / DOCX 입력 범위 확정** (HWP v5.0이 가장 중요)
- [ ] **출력 PDF 정책**: 일반 PDF / PDF/A-1b (보존) / PDF/A-2b (정부 표준)
- [ ] **변환 실패 시 fallback 정책**: 재시도 N회 → 사용자 알림 vs 큐 재투입

### B. 업로드/저장 흐름
- [ ] **GCS 버킷 2개**: `staging/` (원본, 1~7일 후 삭제) + `output/` (PDF, 1~24h 후 삭제)
- [ ] **버킷 라이프사이클 JSON 명세 작성** (둘 다 `AbortIncompleteMultipartUpload` 포함)
- [ ] **CORS 설정**: 브라우저 presigned PUT용 origin 명시
- [ ] **Vercel Route Handler**: presigned URL 발급 (메모리/시간 부담 없음)
- [ ] **MIME 스니핑 + 확장자 이중 검증** (HWP 헤더 시그니처 확인)

### C. Cloud Run 변환 서비스
- [ ] **베이스 이미지**: `node:20-bookworm-slim` + `libreoffice` + `fonts-*` + H2Orestart `.oxt`
- [ ] **메모리/사양**: 2GiB + 1 vCPU 시작, 부하 테스트로 조정
- [ ] **min-instances=1 + max-instances=N + concurrency=1** (CPU > 1일 때 필수)
- [ ] **Startup CPU Boost 활성화**
- [ ] **timeout**: Cloud Run max 60분 (3600s), 콜드 스타트 감안 300~600s
- [ ] **비동기 패턴**: Cloud Tasks / Pub/Sub 큐 + 콜백 URL 또는 프론트 폴링
- [ ] **Watchdog**: 디스크/메모리 누수 감지 → N회 후 컨테이너 자살 → Cloud Run 자동 재기동

### D. 인증/인가
- [ ] **Vercel OIDC ↔ GCP Workload Identity Federation** 설정
- [ ] **Cloud Run invoker**: `roles/run.invoker`을 호출자 SA에 부여
- [ ] **Audience 검증**: Cloud Run URL 정확히 일치
- [ ] **사용자 인증**: NextAuth/Clerk 등 — 익명 업로드 비율 정책 (스팸 방지)

### E. Rate Limiting / Quota
- [ ] **Upstash Redis** (또는 Vercel KV) 프로비저닝
- [ ] **3-tier 규칙**: 익명 IP(엄격) / 로그인 사용자(중간) / 유료(느슨)
- [ ] **차단 단계**: Vercel middleware (IP 기반) + Cloud Run 인입 (사용자 ID 기반)
- [ ] **일일 변환 한도**: 사용자당 N개 (남용 방지 + 비용 제어)

### F. 관측/모니터링
- [ ] **Cloud Run 메트릭**: 메모리 사용률, OOM 횟수, P95/P99 지연
- [ ] **변환 성공률 대시보드**: 5xx 비율, 특정 에러 패턴
- [ ] **GCS 비용 알림**: $X/일 임계치
- [ ] **SLO 정의**: "95% 요청이 30초 내 변환 시작" 같은 명시적 목표

### G. 법적/라이선스
- [ ] **H2Orestart GPL-3.0**: 자체 변환 도구로 호출 시 OK, 소스 비공개 재배포 시 GPL 적용 검토 (SaaS 내부 사용은 일반적으로 OK)
- [ ] **LibreOffice MPL-2.0**: 정적/동적 링크 시 의무 발생
- [ ] **한글 폰트 라이선스**: fonts-nanum (OFL), Noto CJK (OFL), un-fonts (OFL) — 모두 OK
- [ ] **개인정보**: HWP에 개인정보 포함 가능 → GCS 저장 시 암호화(CMEK) + 24h 내 삭제 검토

---

## 10. 사용자 결정 필요 (Assumptions to Confirm)

| # | 가정 | 결정 필요 |
|---|---|---|
| 1 | 입력 HWP 파일은 **평균 5~20MB, 최대 100MB** | 실제 사용자 업로드 패턴 |
| 2 | 변환 시간 SLA는 **30~120초 이내** | UX 허용 한계 |
| 3 | 동시 사용자 **10~50명** 수준 | 피크 부하 |
| 4 | GPL-3.0 (H2Orestart) 사용 OK | 법무/정책 |
| 5 | Cloud Run 리전은 `asia-northeast3` (서울) | 데이터 주권 |
| 6 | Vercel Pro/Ent 사용 (8GB 메모리, 멀티 리전) | 예산 |
| 7 | 사용자는 로그인 필요 (NextAuth/Clerk) | 익명 허용 여부 |
| 8 | PDF/A-1b (전자문서 보존) 출력 필수 | 정부/공공 납품 요건 |
| 9 | 한글과컴퓨터 **한컴통합뷰어 SDK** 라이선스 검토 가능 | 상용화 시 비용 |
| 10 | Cloud Run 단일 인스턴스 모드 (concurrency=1) 운영 | 비용 vs 응답성 |

---

## 11. 프론트엔드 코드: 드래그 앤 드롭 파일 업로드 컴포넌트

### `apps/web/components/upload/DropzoneUploader.tsx`

```tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";

type UploadStatus =
  | "idle"
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

interface UploadResponse {
  jobId: string;
  status: UploadStatus;
  message?: string;
  downloadUrl?: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function DropzoneUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setErrorMessage("");
    setDownloadUrl(null);
    setJobId(null);
    setProgress(0);
    setStatus("idle");

    if (rejectedFiles.length > 0) {
      setErrorMessage("HWP 파일만 업로드할 수 있으며 파일 크기 제한을 확인해주세요.");
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".hwp")) {
      setErrorMessage("현재는 .hwp 파일만 지원합니다.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("파일 크기는 20MB 이하여야 합니다.");
      return;
    }

    setSelectedFile(file);
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    open,
  } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    accept: {
      "application/x-hwp": [".hwp"],
      "application/octet-stream": [".hwp"],
    },
    maxSize: MAX_FILE_SIZE,
  });

  const dropzoneClassName = useMemo(() => {
    const base =
      "w-full max-w-2xl rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer";
    if (isDragReject) {
      return `${base} border-red-400 bg-red-50`;
    }
    if (isDragActive) {
      return `${base} border-blue-500 bg-blue-50 shadow-md`;
    }
    return `${base} border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50`;
  }, [isDragActive, isDragReject]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setStatus("uploading");
      setProgress(15);
      setErrorMessage("");

      const formData = new FormData();
      formData.append("file", selectedFile);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", process.env.NEXT_PUBLIC_API_BASE_URL + "/v1/upload");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 60);
          setProgress(Math.max(15, percent));
        }
      };

      xhr.onreadystatechange = async () => {
        if (xhr.readyState !== 4) return;

        if (xhr.status >= 200 && xhr.status < 300) {
          const response: UploadResponse = JSON.parse(xhr.responseText);
          setJobId(response.jobId);
          setStatus(response.status ?? "queued");
          setProgress(70);

          pollJobStatus(response.jobId);
        } else {
          setStatus("failed");
          setProgress(0);
          setErrorMessage("업로드 또는 변환 요청에 실패했습니다.");
        }
      };

      xhr.send(formData);
    } catch (error) {
      setStatus("failed");
      setProgress(0);
      setErrorMessage("예상치 못한 오류가 발생했습니다.");
    }
  };

  const pollJobStatus = async (currentJobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/jobs/${currentJobId}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error("상태 조회 실패");
        }

        const data = await res.json();

        if (data.status === "queued") {
          setStatus("queued");
          setProgress(75);
        }

        if (data.status === "processing") {
          setStatus("processing");
          setProgress(90);
        }

        if (data.status === "completed") {
          setStatus("completed");
          setProgress(100);
          setDownloadUrl(data.downloadUrl ?? null);
          clearInterval(interval);
        }

        if (data.status === "failed") {
          setStatus("failed");
          setErrorMessage(data.message ?? "변환에 실패했습니다.");
          clearInterval(interval);
        }
      } catch (error) {
        setStatus("failed");
        setErrorMessage("작업 상태를 불러오는 중 오류가 발생했습니다.");
        clearInterval(interval);
      }
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div {...getRootProps()} className={dropzoneClassName}>
        <input {...getInputProps()} />
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-800">
            HWP 파일을 드래그해서 업로드하세요
          </h2>
          <p className="text-sm text-slate-500">
            또는 아래 버튼을 눌러 파일을 선택하세요
          </p>
          <button
            type="button"
            onClick={open}
            className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700"
          >
            파일 선택
          </button>
        </div>
      </div>

      {selectedFile && (
        <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">{selectedFile.name}</p>
              <p className="text-sm text-slate-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={handleUpload}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              disabled={status === "uploading" || status === "processing" || status === "queued"}
            >
              변환 시작
            </button>
          </div>
        </div>
      )}

      {status !== "idle" && (
        <div className="w-full max-w-2xl space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>진행 상태</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-600">
            {status === "uploading" && "파일 업로드 중입니다..."}
            {status === "queued" && "변환 작업이 대기열에 등록되었습니다..."}
            {status === "processing" && "PDF로 변환 중입니다..."}
            {status === "completed" && "변환이 완료되었습니다."}
            {status === "failed" && "변환에 실패했습니다."}
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="w-full max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          PDF 다운로드
        </a>
      )}

      {jobId && (
        <p className="text-xs text-slate-400">작업 ID: {jobId}</p>
      )}
    </div>
  );
}
```

### `apps/web/app/page.tsx`

```tsx
import DropzoneUploader from "@/components/upload/DropzoneUploader";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-20">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            HWP를 PDF로 빠르고 안전하게 변환
          </h1>
          <p className="max-w-2xl text-base text-slate-600 md:text-lg">
            설치 없이 브라우저에서 바로 업로드하고, 변환이 끝나면 즉시 다운로드하세요.
            업로드된 파일은 일정 시간이 지나면 자동으로 삭제됩니다.
          </p>
        </div>

        <DropzoneUploader />

        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-800">간단한 업로드</h3>
            <p className="mt-2 text-sm text-slate-500">
              드래그 앤 드롭으로 문서를 업로드하고 바로 변환을 시작합니다.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-800">안정적 변환 처리</h3>
            <p className="mt-2 text-sm text-slate-500">
              서버리스 백엔드가 문서 변환을 안정적으로 처리합니다.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-800">자동 삭제</h3>
            <p className="mt-2 text-sm text-slate-500">
              업로드 및 결과 파일은 보안 정책에 따라 자동 삭제됩니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
```

---

## 12. 백엔드 API 핵심 로직

### `apps/api/src/routes/upload.route.ts`

```ts
import { Router } from "express";
import multer from "multer";
import path from "path";
import os from "os";
import { uploadAndConvertController } from "../controllers/upload.controller";

const router = Router();

const upload = multer({
  dest: path.join(os.tmpdir(), "uploads"),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (_req, file, cb) => {
    const isHwp = file.originalname.toLowerCase().endsWith(".hwp");
    if (!isHwp) {
      return cb(new Error("Only .hwp files are allowed"));
    }
    cb(null, true);
  },
});

router.post("/", upload.single("file"), uploadAndConvertController);

export default router;
```

### `apps/api/src/controllers/upload.controller.ts`

```ts
import { Request, Response, NextFunction } from "express";
import { uploadOriginalToGCS, uploadPdfToGCS, getSignedDownloadUrl } from "../services/gcs.service";
import { convertHwpToPdf } from "../services/convert.service";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function uploadAndConvertController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      message: "파일이 업로드되지 않았습니다.",
    });
  }

  const jobId = crypto.randomUUID();
  const tempInputPath = file.path;
  const tempOutputDir = path.dirname(tempInputPath);

  try {
    // 1) 원본 HWP를 GCS에 저장
    const originalObjectPath = `temp/original/${jobId}.hwp`;
    await uploadOriginalToGCS(tempInputPath, originalObjectPath);

    // 2) LibreOffice로 PDF 변환
    const pdfPath = await convertHwpToPdf({
      inputPath: tempInputPath,
      outputDir: tempOutputDir,
    });

    // 3) 변환된 PDF를 GCS에 저장
    const pdfObjectPath = `temp/result/${jobId}.pdf`;
    await uploadPdfToGCS(pdfPath, pdfObjectPath);

    // 4) 다운로드용 Signed URL 생성
    const downloadUrl = await getSignedDownloadUrl(pdfObjectPath);

    // 5) 로컬 임시 파일 삭제
    await fs.unlink(tempInputPath).catch(() => {});
    await fs.unlink(pdfPath).catch(() => {});

    return res.status(200).json({
      jobId,
      status: "completed",
      downloadUrl,
    });
  } catch (error) {
    await fs.unlink(tempInputPath).catch(() => {});
    return next(error);
  }
}
```

### `apps/api/src/services/convert.service.ts`

```ts
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

interface ConvertParams {
  inputPath: string;
  outputDir: string;
}

export async function convertHwpToPdf({
  inputPath,
  outputDir,
}: ConvertParams): Promise<string> {
  const sofficeBinary = process.env.LIBREOFFICE_BINARY || "soffice";

  await execFileAsync(
    sofficeBinary,
    [
      "--headless",
      "--nologo",
      "--nofirststartwizard",
      "--convert-to",
      "pdf",
      "--outdir",
      outputDir,
      inputPath,
    ],
    {
      timeout: 1000 * 60 * 2, // 2분
      maxBuffer: 1024 * 1024 * 10,
    }
  );

  const originalBaseName = path.basename(inputPath, path.extname(inputPath));
  const pdfPath = path.join(outputDir, `${originalBaseName}.pdf`);

  await fs.access(pdfPath);

  return pdfPath;
}
```

### `apps/api/src/services/gcs.service.ts`

```ts
import { Storage } from "@google-cloud/storage";

const storage = new Storage();

const bucketName = process.env.GCS_BUCKET_NAME as string;
const bucket = storage.bucket(bucketName);

export async function uploadOriginalToGCS(
  localPath: string,
  objectPath: string
) {
  await bucket.upload(localPath, {
    destination: objectPath,
    metadata: {
      contentType: "application/octet-stream",
    },
  });
}

export async function uploadPdfToGCS(
  localPath: string,
  objectPath: string
) {
  await bucket.upload(localPath, {
    destination: objectPath,
    metadata: {
      contentType: "application/pdf",
    },
  });
}

export async function getSignedDownloadUrl(objectPath: string) {
  const [url] = await bucket.file(objectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 1000 * 60 * 15, // 15분
  });

  return url;
}
```

### `apps/api/src/app.ts`

```ts
import express from "express";
import cors from "cors";
import uploadRoute from "./routes/upload.route";

const app = express();

app.use(
  cors({
    origin: process.env.WEB_ORIGIN?.split(",") ?? "*",
    credentials: false,
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/v1/upload", uploadRoute);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);

  res.status(500).json({
    message: err?.message || "Internal server error",
  });
});

export default app;
```

### `apps/api/src/server.ts`

```ts
import app from "./app";

const port = Number(process.env.PORT || 8080);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
```

---

## 13. Rate Limiting 설계 권장안

요구사항: IP당 1시간 60회

| 옵션 | 구현 | 정확도 | 추천 |
|---|---|---|---|
| A. Express 메모리 기반 | simplest | 낮음 (다중 인스턴스 무시) | 비추천 |
| B. Redis 기반 | Upstash Ratelimit | 높음 | MVP용 |
| C. API Gateway / Cloud Armor | 인프라 레벨 | 높음 | 운영용 |

> "로컬 메모리 기반 limiter는 다중 인스턴스 환경에서 정확하지 않으므로 운영 환경에서는 Redis 또는 GCP 엣지 레벨 제한 정책을 사용한다."

---

## 14. GCS Auto-Cleanup 설계

> "임시 파일은 30분 보존 정책을 기준으로 자동 삭제되며, 실제 삭제 시점은 GCS Lifecycle 평가 주기에 따라 약간 지연될 수 있다."

```json
// infrastructure/gcp/bucket-lifecycle.json
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "age": 1, "matchesPrefix": ["temp/original/"] }
    },
    {
      "action": { "type": "Delete" },
      "condition": { "age": 1, "matchesPrefix": ["temp/result/"] }
    },
    {
      "action": { "type": "AbortIncompleteMultipartUpload" },
      "condition": { "age": 1 }
    }
  ]
}
```

---

## 15. 핵심 출처 (Permalink)

- LibreOffice HWP 필터 한계: https://docs.libreoffice.org/hwpfilter.html
- H2Orestart: https://github.com/ebandal/H2Orestart
- H2Orestart 확장 페이지: https://extensions.libreoffice.org/en/extensions/show/27504
- Vercel Functions Limits: https://vercel.com/docs/functions/limitations
- Vercel 4.5MB 우회 가이드: https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions
- Cloud Run + LibreOffice 운영 사례: https://github.com/ovokpus/cloud-run-pdf-converter-JS
- Cloud Run 서비스 인증: https://docs.cloud.google.com/run/docs/authenticating/service-to-service
- Vercel OIDC ↔ GCP: https://vercel.com/docs/oidc/gcp
- GCS Lifecycle 공식 문서: https://cloud.google.com/storage/docs/lifecycle
- Upstash Ratelimit: https://github.com/upstash/ratelimit-js
- Gotenberg Cloud Run 이슈: https://github.com/gotenberg/gotenberg/issues/1158
- Unoserver (리스너): https://github.com/unoconv/unoserver
- @ohah/hwpjs (Node.js 대안): https://registry.npmjs.org/@ohah/hwpjs

---

## 16. 구현 우선순위 제안

### Phase 1. UX MVP
- Next.js 랜딩 + Dropzone
- 업로드 + 단일 변환 + 결과 다운로드

### Phase 2. 운영 안정화
- Job 상태 추적
- Rate limiting
- signed URL
- GCS lifecycle
- 에러 처리

### Phase 3. 프로덕션 강화
- 관찰성
- 보안 강화
- 성능 튜닝
- 샘플셋 기반 품질 검증
- 한컴 API 대체 어댑터 옵션
