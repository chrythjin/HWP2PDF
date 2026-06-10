# HWP2PDF 서비스 제작 계획서 v1.0

> **프로젝트명**: HWP2PDF  
> **작성일**: 2026-06-10  
> **목표**: Allinpdf 스타일의 직관적인 HWP→PDF 변환 서비스 구축  
> **기반 청사진**: [HWP2PDF-Blueprint.md](./HWP2PDF-Blueprint.md)

---

## 1. 프로젝트 목표 및 범위

### 1.1 서비스 비전
**"설치 없이, 계정 없이, 3클릭 만에 HWP를 PDF로"**

- **타겟 사용자**: 공무원, 학생, 일반 사무직 — HWP 뷰어 없이 PDF가 필요한 사람
- **핵심 가치**: 단순함, 안정성, 보안(자동 삭제)
- **참고 UX**: Allinpdf (직관적 단일 페이지, 진행 상태 명확히 표시)

### 1.2 범위 (Scope)

| 포함 (In Scope) | 제외 (Out of Scope) |
|---|---|
| HWP (.hwp) → PDF 변환 | HWPX (.hwpx) — Phase 2에서 검토 |
| 드래그 앤 드롭 단일 파일 업로드 | 다중 파일 일괄 변환 |
| 변환 진행 상태 표시 (Progress Bar) | 사용자 계정/로그인 시스템 |
| 30분 자동 삭제 (GCS Lifecycle) | 영구 저장/히스토리 |
| IP 기본 Rate Limiting (1시간 60회) | 유료 플랜/크레딧 시스템 |
| 다운로드 Signed URL (15분 TTL) | 이메일 전송, 클라우드 연동 |

### 1.3 성공 기준 (Success Criteria)

| 지표 | 목표값 | 측정 방법 |
|---|---|---|
| 변환 성공률 | ≥ 95% | Cloud Run 로그 분석 |
| 평균 변환 시간 | ≤ 60초 (warm 상태) | Cloud Monitoring |
| 페이지 로드 시간 | ≤ 2초 (LCP) | Vercel Analytics |
| 사용자 이탈률 | ≤ 30% (업로드 후 변환 완료까지) | 프론트 이벤트 트래킹 |
| 운영 가용성 | ≥ 99.5% | Uptime 모니터링 |

---

## 2. 아키텍처 개요

### 2.1 시스템 구성도

```
[사용자 브라우저]
    │
    ▼
┌─────────────────────────────────────┐
│  Next.js Frontend (Vercel)          │
│  - 랜딩 페이지 + Dropzone UI        │
│  - 진행 상태 표시                   │
│  - 다운로드 링크 제공               │
└─────────────────────────────────────┘
    │ ① presigned URL 요청
    ▼
┌─────────────────────────────────────┐
│  API Gateway (Cloud Run)            │
│  - 파일 검증                        │
│  - GCS presigned URL 발급           │
│  - Job 생성/상태 조회               │
│  - Rate Limiting (Redis)            │
└─────────────────────────────────────┘
    │ ② 브라우저 → GCS 직접 업로드
    ▼
┌─────────────────────────────────────┐
│  Google Cloud Storage (temp bucket) │
│  - 원본 HWP 저장 (temp/original/)   │
│  - 결과 PDF 저장 (temp/result/)     │
│  - 30분 후 자동 삭제 (Lifecycle)    │
└─────────────────────────────────────┘
    │ ③ 변환 작업 트리거
    ▼
┌─────────────────────────────────────┐
│  Cloud Run Converter Worker         │
│  - LibreOffice Headless + H2Orestart│
│  - HWP → PDF 변환                   │
│  - 결과 GCS 업로드                  │
│  - 로컬 임시 파일 즉시 삭제         │
└─────────────────────────────────────┘
```

### 2.2 기술 스택 상세

| 레이어 | 기술 | 버전/스펙 | 선택 이유 |
|---|---|---|---|
| **Frontend** | Next.js 14 (App Router) | latest | SSR/ISR, Vercel 최적화 |
| | Tailwind CSS | v3.4 | 빠른 UI 개발, 일관된 디자인 시스템 |
| | react-dropzone | v14 | 검증된 DnD 라이브러리 |
| | TypeScript | v5 | 타입 안정성 |
| **Backend API** | Node.js + Express | v20 LTS | 경량, Cloud Run 친화적 |
| | TypeScript | v5 | 타입 안정성 |
| | Multer | v1.4 | multipart 업로드 처리 |
| | Google Cloud Storage SDK | latest | GCS 통합 |
| **변환 엔진** | LibreOffice | 7.6.x (버전 핀) | GPL-3.0, HWP 지원 |
| | H2Orestart 확장 | latest | HWP v5.0 호환성 |
| | 한글 폰트 | fonts-nanum, Noto CJK | OFL 라이선스 |
| **인프라** | Vercel | Pro 플랜 | Next.js 호스팅, 글로벌 CDN |
| | Google Cloud Run | latest | 서버리스 컨테이너 |
| | GCS | Standard | 임시 저장소 |
| | Redis (Upstash) | latest | Rate Limiting, Job 상태 |
| **CI/CD** | GitHub Actions | latest | 자동화된 빌드/배포 |
| | Docker | latest | Cloud Run 컨테이너화 |

---

## 3. 개발 일정 (Development Schedule)

### 3.1 전체 타임라인 (8주)

```
Week 1-2: [Phase 1] 인프라 세팅 + MVP 프론트엔드
Week 3-4: [Phase 2] 백엔드 API + 변환 엔진 통합
Week 5-6: [Phase 3] 운영 기능 (Rate Limit, 모니터링, 보안)
Week 7:   [Phase 4] 통합 테스트 + 버그 수정 + 성능 튜닝
Week 8:   [Phase 5] 프로덕션 배포 + 사전 운영
```

### 3.2 상세 일정

#### Week 1: 프로젝트 세팅 + 프론트엔드 기초

| 일 | 작업 | 산출물 |
|---|---|---|
| 1-2일 | 모노레포 구조 설정 (pnpm workspace) | `package.json`, `pnpm-workspace.yaml` |
| 2-3일 | Next.js + Tailwind 초기 설정 | `apps/web/` 기본 구조 |
| 3-4일 | Dropzone 컴포넌트 개발 | `DropzoneUploader.tsx` |
| 4-5일 | 메인 페이지 레이아웃 | `page.tsx`, 헤더/푸터 |
| 5-7일 | 프론트엔드 자체 테스트 | 로컬에서 DnD, 상태 변화 확인 |

**Week 1 종료 기준:**
- [ ] 브라우저에서 파일 드래그 앤 드롭 동작
- [ ] 파일 선택 후 변환 시작 버튼 활성화
- [ ] 진행 상태 UI (업로드 중 → 처리 중 → 완료) 표시
- [ ] mock API로 end-to-end 흐름 확인

#### Week 2: GCS 세팅 + 백엔드 기초

| 일 | 작업 | 산출물 |
|---|---|---|
| 1-2일 | GCP 프로젝트 생성, GCS 버킷 생성 | `hwp2pdf-temp` 버킷 |
| 2-3일 | GCS Lifecycle 규칙 설정 | `bucket-lifecycle.json` 적용 |
| 3-4일 | Express API 서버 기본 구조 | `apps/api/` 기본 구조 |
| 4-5일 | presigned URL 발급 API | `POST /v1/upload/presigned` |
| 5-7일 | 프론트엔드 ↔ GCS 직접 업로드 연동 | CORS 설정, 업로드 흐름 확인 |

**Week 2 종료 기준:**
- [ ] GCS 버킷 생성 완료 (private, CORS 설정)
- [ ] presigned URL 발급 API 동작
- [ ] 브라우저에서 GCS로 직접 업로드 성공
- [ ] 업로드된 파일 GCS 콘솔에서 확인

#### Week 3: 변환 엔진 + Cloud Run

| 일 | 작업 | 산출물 |
|---|---|---|
| 1-2일 | LibreOffice + H2Orestart Docker 이미지 빌드 | `Dockerfile` |
| 2-3일 | 로컬에서 HWP→PDF 변환 테스트 | 샘플 HWP 파일 변환 확인 |
| 3-4일 | Cloud Run 배포 설정 | `cloud-run.yaml` |
| 4-5일 | Cloud Run에 변환 서비스 배포 | 변환 API 엔드포인트 |
| 5-7일 | 변환 실패 케이스 수집 + 디버깅 | 실패 패턴 문서화 |

**Week 3 종료 기준:**
- [ ] Docker 이미지 빌드 성공 (LibreOffice + H2Orestart + 폰트)
- [ ] 로컬에서 HWP→PDF 변환 성공
- [ ] Cloud Run에 배포 완료
- [ ] 다양한 HWP 파일로 변환 테스트 (10개 이상 샘플)

#### Week 4: Job 상태 관리 + 완료 흐름

| 일 | 작업 | 산출물 |
|---|---|---|
| 1-2일 | Redis (Upstash) 연동 | Job 상태 저장 |
| 2-3일 | Job 생성/상태 조회 API | `POST /v1/jobs`, `GET /v1/jobs/:id` |
| 3-4일 | 프론트엔드 폴링 구현 | `useJobStatus` 훅 |
| 4-5일 | 변환 완료 → 다운로드 흐름 | Signed URL 발급 |
| 5-7일 | end-to-end 통합 테스트 | 업로드→변환→다운로드 전체 흐름 |

**Week 4 종료 기준:**
- [ ] 업로드 → 변환 → 다운로드 전체 흐름 동작
- [ ] Job 상태 추적 정상 작동
- [ ] 변환 실패 시 에러 메시지 표시
- [ ] 10회 이상 연속 변환 성공

#### Week 5: Rate Limiting + 보안

| 일 | 작업 | 산출물 |
|---|---|---|
| 1-2일 | Upstash Ratelimit 설정 | `rate-limit.service.ts` |
| 2-3일 | IP 기반 Rate Limiting 적용 | Middleware 적용 |
| 3-4일 | 파일 검증 강화 (MIME, 크기, 시그니처) | `validators.ts` |
| 4-5일 | 에러 처리 표준화 | 에러 코드 정의, 사용자 친화적 메시지 |
| 5-7일 | 보안 점검 (CORS, 헤더, 입력 검증) | 보안 체크리스트 완료 |

**Week 5 종료 기준:**
- [ ] Rate Limiting 동작 (1시간 60회 제한)
- [ ] 429 응답에 Retry-After 헤더 포함
- [ ] 비정상 파일 업로드 차단 (확장자, 크기, MIME)
- [ ] OWASP Top 10 기본 검토 완료

#### Week 6: 모니터링 + 로깅 + 알림

| 일 | 작업 | 산출물 |
|---|---|---|
| 1-2일 | Cloud Logging 설정 | 구조화된 로그 출력 |
| 2-3일 | Cloud Monitoring 대시보드 | 변환 성공률, 지연 시간 |
| 3-4일 | Sentry 연동 (프론트/백) | 에러 트래킹 |
| 4-5일 | 알림 설정 (Slack/Email) | 장애 알림 |
| 5-7일 | 부하 테스트 | 동시 요청 처리 확인 |

**Week 6 종료 기준:**
- [ ] Cloud Monitoring 대시보드 가동
- [ ] 에러 발생 시 Slack 알림
- [ ] 10 동시 요청 처리 성공
- [ ] 평균 변환 시간 측정 완료

#### Week 7: 통합 테스트 + 성능 튜닝

| 일 | 작업 | 산출물 |
|---|---|---|
| 1-3일 | 통합 테스트 시나리오 실행 | 테스트 결과 보고서 |
| 3-4일 | 성능 병목 분석 + 튜닝 | 최적화 적용 |
| 4-5일 | 다양한 HWP 파일로 품질 검증 | 샘플셋 변환 결과 |
| 5-7일 | 버그 수정 + 안정화 | 안정화 릴리즈 |

**Week 7 종료 기준:**
- [ ] 50개 이상 다양한 HWP 파일 변환 테스트
- [ ] 변환 성공률 95% 이상
- [ ] 평균 변환 시간 60초 이내
- [ ] 주요 버그 수정 완료

#### Week 8: 프로덕션 배포 + 사전 운영

| 일 | 작업 | 산출물 |
|---|---|---|
| 1-2일 | 프로덕션 환경 구성 | 프로덕션 GCS 버킷, Cloud Run |
| 2-3일 | GitHub Actions CI/CD 파이프라인 | `.github/workflows/` |
| 3-4일 | 프로덕션 배포 | 라이브 서비스 |
| 4-5일 | 모니터링 + 초기 안정화 | 이슈 대응 |
| 5-7일 | 문서화 + 지식 이관 | 운영 문서, README |

**Week 8 종료 기준:**
- [ ] 프로덕션 URL에서 서비스 접속 가능
- [ ] CI/CD로 자동 배포 동작
- [ ] 24시간 무장애 운영
- [ ] 운영 문서 완성

---

## 4. 단계별 구현 상세

### Phase 1: 인프라 세팅 + MVP 프론트엔드 (Week 1-2)

#### 4.1.1 모노레포 설정

```bash
# Root package.json
{
  "name": "hwp2pdf",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "packageManager": "pnpm@8.15.0"
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

#### 4.1.2 Next.js 프론트엔드 초기화

```bash
cd apps
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd web
pnpm add react-dropzone
```

#### 4.1.3 공용 타입 패키지

```
packages/shared/
├── src/
│   ├── api-types.ts      # API 요청/응답 타입
│   ├── job-status.ts     # Job 상태 enum
│   └── validation.ts     # 공용 검증 로직
├── package.json
└── tsconfig.json
```

```typescript
// packages/shared/src/job-status.ts
export enum JobStatus {
  IDLE = "idle",
  UPLOADING = "uploading",
  QUEUED = "queued",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  EXPIRED = "expired",
}

export interface Job {
  id: string;
  status: JobStatus;
  originalFilename: string;
  createdAt: Date;
  updatedAt: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  errorMessage?: string;
}
```

### Phase 2: 백엔드 API + 변환 엔진 (Week 3-4)

#### 4.2.1 Express API 서버 구조

```
apps/api/src/
├── app.ts                  # Express 앱 설정
├── server.ts               # 서버 진입점
├── routes/
│   ├── upload.route.ts     # 업로드/Job 생성
│   ├── jobs.route.ts       # Job 상태 조회
│   ├── download.route.ts   # 다운로드
│   └── health.route.ts     # 헬스체크
├── controllers/
│   ├── upload.controller.ts
│   ├── jobs.controller.ts
│   └── download.controller.ts
├── services/
│   ├── gcs.service.ts      # GCS 업로드/다운로드
│   ├── convert.service.ts  # LibreOffice 변환
│   ├── job.service.ts      # Job CRUD
│   ├── rate-limit.service.ts
│   └── cleanup.service.ts
├── middleware/
│   ├── upload.middleware.ts
│   ├── error.middleware.ts
│   ├── rate-limit.middleware.ts
│   └── request-id.middleware.ts
├── lib/
│   ├── logger.ts
│   ├── env.ts              # 환경변수 검증
│   └── errors.ts           # 커스텀 에러 클래스
├── utils/
│   ├── file.ts
│   ├── mime.ts
│   └── shell.ts
└── types/
    └── job.ts
```

#### 4.2.2 환경변수 스키마

```typescript
// apps/api/src/lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("8080"),
  
  // GCS
  GCS_BUCKET_NAME: z.string(),
  GCS_PROJECT_ID: z.string(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  
  // Redis
  REDIS_URL: z.string(),
  
  // LibreOffice
  LIBREOFFICE_BINARY: z.string().default("soffice"),
  
  // 보안
  WEB_ORIGIN: z.string(),
  API_SECRET: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.string().default("60"),
  RATE_LIMIT_WINDOW_MS: z.string().default("3600000"), // 1시간
});

export const env = envSchema.parse(process.env);
```

#### 4.2.3 Job 서비스 (Redis 기반)

```typescript
// apps/api/src/services/job.service.ts
import { Redis } from "ioredis";
import { Job, JobStatus } from "@hwp2pdf/shared";
import { randomUUID } from "crypto";

const redis = new Redis(process.env.REDIS_URL!);

const JOB_TTL = 60 * 60 * 2; // 2시간

export async function createJob(originalFilename: string): Promise<Job> {
  const job: Job = {
    id: randomUUID(),
    status: JobStatus.UPLOADING,
    originalFilename,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await redis.setex(
    `job:${job.id}`,
    JOB_TTL,
    JSON.stringify(job)
  );
  
  return job;
}

export async function getJob(id: string): Promise<Job | null> {
  const data = await redis.get(`job:${id}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function updateJob(
  id: string,
  updates: Partial<Job>
): Promise<Job | null> {
  const job = await getJob(id);
  if (!job) return null;
  
  const updated = {
    ...job,
    ...updates,
    updatedAt: new Date(),
  };
  
  await redis.setex(
    `job:${id}`,
    JOB_TTL,
    JSON.stringify(updated)
  );
  
  return updated;
}

export async function deleteJob(id: string): Promise<void> {
  await redis.del(`job:${id}`);
}
```

#### 4.2.4 변환 서비스 (LibreOffice + H2Orestart)

```typescript
// apps/api/src/services/convert.service.ts
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { env } from "../lib/env";

const execFileAsync = promisify(execFile);

interface ConvertParams {
  inputPath: string;
  outputDir: string;
  jobId: string;
}

export class ConversionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly jobId: string
  ) {
    super(message);
    this.name = "ConversionError";
  }
}

export async function convertHwpToPdf({
  inputPath,
  outputDir,
  jobId,
}: ConvertParams): Promise<string> {
  const sofficeBinary = env.LIBREOFFICE_BINARY;
  
  // LibreOffice가 headless 모드에서도 프로필 디렉토리 필요
  const userProfileDir = path.join("/tmp", `lo-profile-${jobId}`);
  await fs.mkdir(userProfileDir, { recursive: true });
  
  try {
    await execFileAsync(
      sofficeBinary,
      [
        "--headless",
        "--nologo",
        "--nofirststartwizard",
        "--norestore",
        "--user-profile-dir", userProfileDir,
        "--infilter=\"Hwp2002_File\"", // H2Orestart 필터
        "--convert-to",
        "pdf:writer_pdf_Export:UTF8=1", // UTF-8 강제
        "--outdir",
        outputDir,
        inputPath,
      ],
      {
        timeout: 1000 * 60 * 3, // 3분 타임아웃
        maxBuffer: 1024 * 1024 * 10,
        env: {
          ...process.env,
          // 한글 로케일 강제
          LANG: "ko_KR.UTF-8",
          LC_ALL: "ko_KR.UTF-8",
        },
      }
    );
    
    const originalBaseName = path.basename(inputPath, path.extname(inputPath));
    const pdfPath = path.join(outputDir, `${originalBaseName}.pdf`);
    
    // 변환 결과 확인
    try {
      await fs.access(pdfPath);
      const stats = await fs.stat(pdfPath);
      if (stats.size === 0) {
        throw new ConversionError(
          "변환된 PDF 파일이 비어 있습니다.",
          "EMPTY_PDF",
          jobId
        );
      }
      return pdfPath;
    } catch (error) {
      if (error instanceof ConversionError) throw error;
      throw new ConversionError(
        "PDF 변환 결과를 찾을 수 없습니다.",
        "PDF_NOT_FOUND",
        jobId
      );
    }
  } finally {
    // 프로필 디렉토리 정리
    await fs.rm(userProfileDir, { recursive: true, force: true }).catch(() => {});
  }
}
```

#### 4.2.5 GCS 서비스

```typescript
// apps/api/src/services/gcs.service.ts
import { Storage } from "@google-cloud/storage";
import { env } from "../lib/env";

const storage = new Storage();
const bucket = storage.bucket(env.GCS_BUCKET_NAME);

export async function uploadToGCS(
  localPath: string,
  destination: string,
  contentType: string
): Promise<void> {
  await bucket.upload(localPath, {
    destination,
    metadata: {
      contentType,
      metadata: {
        // 추적용 메타데이터
        uploadedAt: new Date().toISOString(),
      },
    },
  });
}

export async function getSignedDownloadUrl(
  objectPath: string,
  expiresInMinutes: number = 15
): Promise<string> {
  const [url] = await bucket.file(objectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 1000 * 60 * expiresInMinutes,
  });
  
  return url;
}

export async function deleteGCSObject(objectPath: string): Promise<void> {
  await bucket.file(objectPath).delete();
}

export async function generatePresignedUploadUrl(
  objectPath: string,
  contentType: string,
  expiresInMinutes: number = 5
): Promise<string> {
  const [url] = await bucket.file(objectPath).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 1000 * 60 * expiresInMinutes,
    contentType,
  });
  
  return url;
}
```

### Phase 3: 운영 기능 (Week 5-6)

#### 4.3.1 Rate Limiting (Upstash Redis)

```typescript
// apps/api/src/services/rate-limit.service.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "../lib/env";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    parseInt(env.RATE_LIMIT_MAX),
    `${parseInt(env.RATE_LIMIT_WINDOW_MS)} ms`
  ),
  analytics: true,
});

export async function checkRateLimit(
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const result = await ratelimit.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
```

```typescript
// apps/api/src/middleware/rate-limit.middleware.ts
import { Request, Response, NextFunction } from "express";
import { checkRateLimit } from "../services/rate-limit.service";

export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // IP 기반 식별자 (프록시 고려)
  const identifier = req.ip || req.socket.remoteAddress || "anonymous";
  
  const result = await checkRateLimit(identifier);
  
  // 응답 헤더 설정
  res.setHeader("X-RateLimit-Limit", result.limit);
  res.setHeader("X-RateLimit-Remaining", result.remaining);
  res.setHeader("X-RateLimit-Reset", result.reset);
  
  if (!result.success) {
    res.setHeader("Retry-After", Math.ceil((result.reset - Date.now()) / 1000));
    return res.status(429).json({
      error: "Too Many Requests",
      message: "1시간 동안 너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.",
    });
  }
  
  next();
}
```

#### 4.3.2 에러 처리 미들웨어

```typescript
// apps/api/src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { ConversionError } from "../services/convert.service";

interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  jobId?: string;
}

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("[Error]", err);
  
  const response: ErrorResponse = {
    error: "Internal Server Error",
    message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  };
  
  let statusCode = 500;
  
  if (err instanceof ConversionError) {
    statusCode = 422;
    response.error = "Conversion Failed";
    response.message = err.message;
    response.code = err.code;
    response.jobId = err.jobId;
  } else if (err.message.includes("Only .hwp files")) {
    statusCode = 400;
    response.error = "Invalid File";
    response.message = err.message;
  } else if (err.message.includes("file size")) {
    statusCode = 413;
    response.error = "File Too Large";
    response.message = "파일 크기 제한을 초과했습니다. (최대 20MB)";
  }
  
  res.status(statusCode).json(response);
}
```

### Phase 4: 통합 테스트 + 배포 (Week 7-8)

#### 4.4.1 GitHub Actions CI/CD

```yaml
# .github/workflows/web-deploy.yml
name: Deploy Web

on:
  push:
    branches: [main]
    paths:
      - "apps/web/**"
      - "packages/shared/**"
      - ".github/workflows/web-deploy.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build shared package
        run: pnpm --filter @hwp2pdf/shared build
      
      - name: Build web
        run: pnpm --filter web build
      
      - name: Deploy to Vercel
        uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

```yaml
# .github/workflows/api-deploy.yml
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - "apps/api/**"
      - "packages/shared/**"
      - "Dockerfile"
      - ".github/workflows/api-deploy.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Google Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          service_account_key: ${{ secrets.GCP_SA_KEY }}
      
      - name: Configure Docker
        run: gcloud auth configure-docker
      
      - name: Build Docker image
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/hwp2pdf-api:${{ github.sha }} .
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/hwp2pdf-api:${{ github.sha }}
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy hwp2pdf-api \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/hwp2pdf-api:${{ github.sha }} \
            --platform managed \
            --region asia-northeast3 \
            --allow-unauthenticated \
            --memory 2Gi \
            --cpu 1 \
            --concurrency 1 \
            --timeout 300 \
            --min-instances 1 \
            --max-instances 10 \
            --set-env-vars "NODE_ENV=production" \
            --set-env-vars "GCS_BUCKET_NAME=${{ secrets.GCS_BUCKET_NAME }}" \
            --set-env-vars "REDIS_URL=${{ secrets.REDIS_URL }}"
```

#### 4.4.2 Dockerfile (LibreOffice + H2Orestart)

```dockerfile
# apps/api/Dockerfile
FROM node:20-bookworm-slim

# LibreOffice + 한글 폰트 설치
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-java-common \
    fonts-nanum \
    fonts-noto-cjk \
    fonts-unfonts-core \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# H2Orestart 확장 설치
RUN curl -L -o /tmp/h2orestart.oxt \
    "https://github.com/ebandal/H2Orestart/releases/download/v0.7.12/H2Orestart.oxt" \
    && unopkg add --shared /tmp/h2orestart.oxt \
    && rm /tmp/h2orestart.oxt

WORKDIR /app

# 의존성 설치
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 소스 복사 및 빌드
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm --filter @hwp2pdf/shared build \
    && pnpm --filter api build

# 비root 사용자로 실행
RUN useradd -m -u 1000 appuser
USER appuser

ENV PORT=8080
ENV NODE_ENV=production
ENV LIBREOFFICE_BINARY=libreoffice

EXPOSE 8080

CMD ["node", "apps/api/dist/server.js"]
```

---

## 5. 테스트 계획

### 5.1 단위 테스트

| 대상 | 테스트 내용 | 도구 |
|---|---|---|
| 파일 검증 | 확장자, 크기, MIME 검증 | Jest |
| Job 서비스 | CRUD, TTL 만료 | Jest + ioredis-mock |
| Rate Limit | 제한 초과, 헤더 확인 | Jest |
| GCS 서비스 | presigned URL 생성 | Jest + @google-cloud/storage mock |

### 5.2 통합 테스트

| 시나리오 | 단계 | 예상 결과 |
|---|---|---|
| 정상 변환 | 파일 업로드 → 변환 → 다운로드 | 200, PDF 다운로드 성공 |
| 대용량 파일 | 20MB HWP 업로드 | 413 Payload Too Large |
| 잘못된 형식 | .exe 파일 업로드 시도 | 400 Invalid File |
| 변환 실패 | 손상된 HWP | 422 Conversion Failed, 에러 메시지 |
| Rate Limit | 61회 연속 요청 | 429 Too Many Requests |
| 동시 요청 | 10개 동시 업로드 | 모두 정상 처리 또는 큐 대기 |
| 만료 다운로드 | 15분 후 다운로드 시도 | 403/404 만료 |

### 5.3 E2E 테스트

| 시나리오 | 도구 |
|---|---|
| 브라우저에서 DnD → 변환 → 다운로드 | Playwright |
| 모바일 반응형 UI | Playwright + 디바이스 에뮬레이션 |
| 다양한 HWP 파일 변환 | Playwright + 샘플 파일셋 |

---

## 6. 리스크 관리

### 6.1 리스크 레지스터

| ID | 리스크 | 가능성 | 영향도 | 대응 전략 | 담당 |
|---|---|---|---|---|---|
| R1 | HWP v5.0 변환 품질 불량 (깨짐/손실) | 중 | 높음 | 샘플셋 100개 사전 검증 + fallback 경로 고려 + 사용자에게 품질 한계 고지 | 개발팀 |
| R2 | Cloud Run 콜드 스타트 30초+ | 중 | 높음 | min-instances=1 + Startup CPU Boost + 비동기 Job UX | 인프라팀 |
| R3 | 메모리 OOM (큰 HWP + 이미지) | 중 | 높음 | 메모리 2GiB 시작 + OOM 감시 + Watchdog 패턴 | 인프라팀 |
| R4 | GCS 비용 누수 | 낮음 | 중간 | Lifecycle 규칙 엄격 적용 + AbortIncompleteMultipartUpload + 비용 알림 | 인프라팀 |
| R5 | H2Orestart GPL-3.0 라이선스 이슈 | 낮음 | 높음 | 법무 검토 + 상용 대안(한컴/Aspose) 백업 계획 | PM |
| R6 | Vercel 함수 크기 제한 (4.5MB) | 낮음 | 높음 | presigned URL 방식으로 GCS 직접 업로드 (이미 설계 반영) | 개발팀 |
| R7 | 동시 부하로 인한 서비스 지연 | 중 | 중간 | max-instances 제한 + 큐잉 + 사용자에게 대기 안내 | 인프라팀 |
| R8 | 악성 파일 업로드 (ZIP bomb 등) | 중 | 중간 | 파일 크기 제한 + MIME 검증 + 처리 시간 제한 + sandbox | 보안팀 |

### 6.2 Contingency Plan (비상 계획)

**시나리오: LibreOffice 변환 품질이 서비스 기준 미달**

1. **감지**: 샘플셋 변환 품질 검증 (Week 3-4)
2. **대응**: 
   - 한컴통합뷰어 SDK 평가 (비용/라이선스 확인)
   - Aspose.PDF for Node.js 평가 (WASM, 상용)
   - @ohah/hwpjs (Rust 기반 Node.js 라이브러리) 검증
3. **결정 기준**: 변환 성공률 < 90% 또는 주요 레이아웃 깨짐
4. **전환 시간**: 1-2주 (어댑터 개발)

---

## 7. 보안 계획

### 7.1 데이터 흐름 보안

```
[사용자] ──HTTPS──▶ [Vercel CDN] ──HTTPS──▶ [Cloud Run API]
   │                                               │
   │                                               │ (Service Account)
   │                                               ▼
   │                                           [GCS Private Bucket]
   │                                               │
   │◀──Signed URL (15분 TTL)──────────────────────┘
```

### 7.2 보안 체크리스트

| 항목 | 적용 | 검증 방법 |
|---|---|---|
| GCS 버킷 Public Access 차단 | ✅ | `gsutil iam get` |
| 모든 통신 HTTPS | ✅ | Vercel/Cloud Run 기본 |
| 파일명 UUID 변환 | ✅ | 코드 리뷰 |
| Signed URL 짧은 TTL | ✅ | 15분 설정 |
| Rate Limiting | ✅ | Upstash Redis |
| 입력 파일 검증 | ✅ | 확장자 + MIME + 크기 |
| 컨테이너 비root 실행 | ✅ | Dockerfile USER 지시자 |
| LibreOffice sandbox | ✅ | --headless, 제한된 권한 |
| 민감 정보 환경변수 | ✅ | `.env` 파일 `.gitignore` |
| CORS 엄격 설정 | ✅ | 특정 origin만 허용 |

---

## 8. 운영 계획

### 8.1 모니터링 대시보드

| 지표 | 도구 | 알림 임계치 |
|---|---|---|
| 변환 성공률 | Cloud Monitoring | < 95% |
| 평균 변환 시간 | Cloud Monitoring | > 60초 |
| API 오류률 | Cloud Monitoring | > 5% |
| 메모리 사용률 | Cloud Monitoring | > 85% |
| OOM 횟수 | Cloud Logging | > 0/시간 |
| Rate Limit 도달 횟수 | Upstash Analytics | > 100/시간 |
| GCS 비용 | GCP Billing | > $10/일 |
| Vercel 함수 실행 시간 | Vercel Analytics | > 5초 |

### 8.2 알림 체계

| 상황 | 채널 | 수신자 |
|---|---|---|
| 서비스 다운 (5xx > 10%) | Slack + Email | 온콜 엔지니어 |
| 변환 실패율 급증 | Slack | 개발팀 |
| OOM 발생 | Slack + PagerDuty | 인프라팀 |
| 예상 외 비용 발생 | Email | PM + 인프라팀 |
| Rate Limit 집중 발생 | Slack | 보안팀 |

### 8.3 장애 대응 Runbook

**상황: 변환 API 500 에러 급증**

1. Cloud Run 로그 확인 (`severity=ERROR`)
2. 최근 배포 여부 확인 → 필요시 롤백
3. 메모리/CPU 사용률 확인 → OOM 여부
4. 특정 HWP 파일 패턴 확인 → 해당 파일로 재현 테스트
5. 임시 해결: max-instances 증가 또는 min-instances 조정
6. 근본 원인 분석 후 수정 배포

---

## 9. 비용 예상

### 9.1 월간 예상 비용 (MVP 기준, 월 10,000 변환)

| 항목 | 서비스 | 예상 비용 |
|---|---|---|
| 프론트엔드 호스팅 | Vercel Pro | $20/월 |
| API 서버 | Cloud Run (min=1, 2GiB) | ~$15/월 |
| 변환 Worker | Cloud Run (요청당 과금) | ~$10/월 |
| 임시 저장소 | GCS Standard (10GB) | ~$0.50/월 |
| 네트워크 | GCS Egress | ~$5/월 |
| Rate Limiting | Upstash Redis (무료 티어) | $0/월 |
| 모니터링 | Cloud Monitoring (무료 할당량) | $0/월 |
| **합계** | | **~$50/월** |

### 9.2 비용 최적화

- GCS Nearline/Coldline 전환 검토 (접근 빈도 낮음)
- Cloud Run min-instances 조정 (트래픽 패턴에 따라)
- Vercel Pro vs Enterprise 평가 (멀티 리전 필요 시)

---

## 10. 문서 및 산출물

### 10.1 개발 문서

| 문서 | 위치 | 담당 |
|---|---|---|
| 제작 청사진 | `docs/superpowers/specs/HWP2PDF-Blueprint.md` | 아키텍트 |
| API 명세 | `docs/api/openapi.yaml` | 백엔드 개발 |
| DB 스키마 | N/A (Redis 사용) | 백엔드 개발 |
| 배포 가이드 | `docs/operations/deployment.md` | DevOps |
| 장애 대응 Runbook | `docs/operations/runbook.md` | DevOps |

### 10.2 코드 문서

| 항목 | 도구 |
|---|---|
| API 문서 | Swagger UI (Express) |
| 타입 문서 | TypeDoc |
| 컴포넌트 문서 | Storybook (선택) |

---

## 11. 팀 구성 및 역할

| 역할 | 인원 | 주요 업무 |
|---|---|---|
| **Tech Lead / 아키텍트** | 1 | 아키텍처 설계, 기술 결정, 코드 리뷰 |
| **Frontend 개발** | 1 | Next.js UI, UX 구현 |
| **Backend 개발** | 1 | API, 변환 엔진 통합 |
| **DevOps / 인프라** | 1 (겸업 가능) | GCP, Vercel, CI/CD, 모니터링 |
| **PM / 기획** | 1 (겸업 가능) | 일정 관리, 품질 검증, 의사결정 |

---

## 12. 승인 및 변경 이력

### 12.1 승인

| 역할 | 이름 | 서명 | 날짜 |
|---|---|---|---|
| 기획/PM | | | |
| Tech Lead | | | |
| 백엔드 리드 | | | |
| 프론트엔드 리드 | | | |

### 12.2 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|---|---|---|---|
| 1.0 | 2026-06-10 | AI Assistant | 초안 작성 |
| | | | |

---

## 13. 부록

### 부록 A: 샘플 HWP 테스트셋

변환 품질 검증을 위한 테스트 파일 목록:

| # | 파일명 | 크기 | 설명 | 중요도 |
|---|---|---|---|---|
| 1 | simple_text.hwp | 10KB | 순수 텍스트 문서 | 필수 |
| 2 | with_images.hwp | 500KB | 이미지 포함 문서 | 필수 |
| 3 | with_tables.hwp | 100KB | 표 포함 문서 | 필수 |
| 4 | with_equations.hwp | 50KB | 수식 포함 문서 | 중요 |
| 5 | complex_layout.hwp | 1MB | 복잡한 레이아웃 | 중요 |
| 6 | government_form.hwp | 200KB | 정부 양식 | 중요 |
| 7 | large_file.hwp | 15MB | 대용량 문서 | 중요 |
| 8 | corrupted.hwp | - | 손상된 파일 (음수 테스트) | 필수 |
| 9 | password_protected.hwp | - | 암호화된 파일 (예외 처리) | 중요 |
| 10 | hwp5_v3_compatibility.hwp | - | 구버전 호환성 | 선택 |

### 부록 B: 에러 코드 정의

| 코드 | 설명 | HTTP 상태 | 사용자 메시지 |
|---|---|---|---|
| `INVALID_FILE` | 잘못된 파일 형식 | 400 | 지원하지 않는 파일 형식입니다. |
| `FILE_TOO_LARGE` | 파일 크기 초과 | 413 | 파일 크기는 20MB 이하여야 합니다. |
| `CONVERSION_FAILED` | 변환 실패 | 422 | 파일 변환에 실패했습니다. |
| `EMPTY_PDF` | 빈 PDF 출력 | 422 | 변환 결과가 비어 있습니다. |
| `PDF_NOT_FOUND` | PDF 생성 실패 | 422 | 변환 결과를 찾을 수 없습니다. |
| `JOB_NOT_FOUND` | Job 없음 | 404 | 요청한 작업을 찾을 수 없습니다. |
| `JOB_EXPIRED` | Job 만료 | 410 | 작업이 만료되었습니다. 다시 업로드해주세요. |
| `RATE_LIMITED` | 요청 제한 | 429 | 너무 많은 요청입니다. 잠시 후 다시 시도해주세요. |
| `INTERNAL_ERROR` | 서버 오류 | 500 | 서버 오류가 발생했습니다. |

### 부록 C: 환경변수 목록

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_BASE_URL=https://api.hwp2pdf.example.com

# Backend (.env)
NODE_ENV=production
PORT=8080
GCS_BUCKET_NAME=hwp2pdf-temp
GCS_PROJECT_ID=your-project-id
REDIS_URL=rediss://default:...@...upstash.io:6379
WEB_ORIGIN=https://hwp2pdf.vercel.app
LIBREOFFICE_BINARY=libreoffice
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=3600000
```
