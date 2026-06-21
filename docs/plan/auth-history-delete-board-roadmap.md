---
title: HWP2PDF 회원·이력·삭제·게시판 기능 로드맵
summary: 아이디/비밀번호 인증, 변환 이력 관리, 파일 직접 삭제, 비회원 변환 유지, 회원 전용 게시판을 추가하기 위한 단계별 실행 계획.
tags: [roadmap, auth, history, deletion, board, firestore, firebase-auth]
date: 2026-06-21
status: planned
---

# HWP2PDF 회원·이력·삭제·게시판 기능 로드맵

## 1. 현재 상태 (확인 사실)

- **인증 없음**: `apps/api`와 `apps/web` 모두 로그인/회원가입/세션 처리가 없습니다. `firebase`, `firebase-admin`, `next-auth`, `clerk` 등의 의존성이 없습니다.
- **Job은 익명**: `JobRecord`에 `userId`/`ownerId` 필드가 없습니다. 클라이언트는 무작위 `jobId`만으로 작업을 조회합니다.
- **변환은 이미 서버 사이드 비동기**: 브라우저가 `/v1/uploads/complete` 또는 `POST /v1/upload`를 받은 뒤 `void convertJobToPdf(...)`를 호출하므로, **페이지를 나가도 백엔드 변환은 계속 진행됩니다**. 다만 GCS 직접 업로드 중 페이지를 닫으면 `/v1/uploads/complete`가 호출되지 않아 job이 생성되지 않습니다.
- **삭제 기능 없음**: `DELETE /v1/jobs/:jobId`, `DELETE /v1/results/:fileName` 등이 없고, GCS 원본/결과 객체를 사용자 요청으로 삭제하는 코드도 없습니다.
- **이력 관리 없음**: 사용자별 변환 목록을 조회하는 API나 페이지가 없습니다.
- **게시판 없음**: `/`, `/privacy`, `/terms`, `/contact`만 존재합니다.
- **데이터 저장소**: production에서 `FirestoreJobStore` 사용 중. `FIRESTORE_JOBS_COLLECTION`에 job 문서 저장. 사용자 컬렉션은 없습니다.
- **보관/만료**: `JOB_RETENTION_MINUTES` 기본 30분, 서명 다운로드 URL 기본 15분. GCS lifecycle로 `staging/`, `output/` 객체는 1일 후 삭제.

## 2. 목표 요약

1. 아이디/비밀번호 기반 회원가입/로그인 제공.
2. 로그인 사용자의 변환 이력 조회 및 관리.
3. 파일/결과물을 사용자가 직접 삭제.
4. **비회원도 변환 가능**하되 이력 관리는 제공하지 않음.
5. 회원 전용 게시판 추가(읽기/쓰기 모두 회원-only).

## 3. 추천 인증 방식

**Firebase Authentication (Client SDK) + Firebase Admin SDK (API)**

이유:
- production에서 이미 Firestore를 사용 중이므로 Firebase 프로젝트가 있다면 인증을 같은 프로젝트에 붙이는 것이 가장 자연스럽습니다.
- Google Cloud Identity Platform을 사용해도 동일한 Admin SDK로 ID token 검증이 가능합니다.
- Email/Password provider로 아이디/비밀번호 가입/로그인을 지원합니다.
- Firebase Auth는 클라이언트 SDK에서 직접 가입/로그인하므로 서버에 비밀번호 저장이 필요 없습니다.

대안:
- **NextAuth.js v5**: Next.js App Router와 잘 맞지만 DB 세션/어댑터 추가 작업이 더 많습니다.
- **Clerk**: 빠르지만 외부 SaaS 의존성과 추가 비용이 발생할 수 있습니다.

> 현재 코드에 Firebase Auth 흔적이 없으므로, Firebase 콘솔에서 Authentication provider 활성화 및 Firebase Admin SDK 초기 설정이 필요합니다.

## 4. 단계별 실행 계획

### Phase 1: 인증 기반 마련

목표: 회원가입/로그인/로그아웃/토큰 검증 파이프라인을 추가합니다.

#### 4.1.1 데이터 모델 추가

`packages/shared/src/index.ts` 또는 새 파일 `packages/shared/src/auth-types.ts`에:

```ts
export interface UserIdentity {
  userId: string; // Firebase UID
  email: string;
  displayName?: string;
  createdAt: string; // ISO timestamp
}

export interface SignUpRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

#### 4.1.2 백엔드 (apps/api)

1. 의존성 추가: `firebase-admin`.
2. 설정값 추가 (`apps/api/src/config.ts`):
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - 선택: `FIREBASE_AUTH_EMULATOR_HOST` (로컬 개발용)
3. Firebase Admin 초기화 (`apps/api/src/lib/firebase-admin.ts`).
4. 인증 미들웨어 (`apps/api/src/middleware/auth.ts`):
   - `Authorization: Bearer <idToken>` 헤더에서 토큰 추출.
   - `admin.auth().verifyIdToken(token)`으로 검증.
   - 성공 시 `req.user = { userId, email }` 주입.
   - 실패 시 401.
5. 새 엔드포인트 (`apps/api/src/routes/v1.ts` 또는 `apps/api/src/routes/auth.ts`):
   - `POST /v1/auth/token/refresh` — 선택사항, 클라이언트가 Firebase client SDK로 직접 갱신할 수 있으면 불필요.
   - 인증된 사용자 정보 조회 `GET /v1/me`.

#### 4.1.3 프론트엔드 (apps/web)

1. 의존성 추가: `firebase` (client SDK).
2. Firebase client 초기화 (`apps/web/src/lib/firebase.ts`).
3. 인증 Context/Provider (`apps/web/src/lib/auth-context.tsx`):
   - `useAuth()` hook 제공.
   - 로그인 상태, 사용자 이메일, 로딩 상태 관리.
4. 페이지 추가:
   - `/login` — 로그인 폼
   - `/signup` — 회원가입 폼
   - `/logout` — 로그아웃 처리 후 홈으로 redirect
5. UI:
   - Header 또는 `PageLayout`에 로그인/회원가입/이메일/로그아웃 링크 추가.
   - 기존 Tailwind 카드/버튼 스타일 재사용.

#### 4.1.4 보안/배포

- Firestore Security Rules는 **Phase 2 이후**에 같이 수정. Phase 1에서는 Admin SDK만 사용.
- Firebase Console에서 Email/Password provider 활성화.
- Cloud Run에 Firebase Admin 서비스 계정 키 또는 Workload Identity 주입.
- Vercel 환경변수에 Firebase client config (`NEXT_PUBLIC_FIREBASE_*`) 등록.

---

### Phase 2: 사용자별 Job 이력 + 삭제

목표: `JobRecord`에 소유자 추가, 로그인 사용자의 변환 이력 조회, 파일 직접 삭제.

#### 4.2.1 데이터 모델 변경

`apps/api/src/services/job-store.ts`의 `JobRecord`에 추가:

```ts
userId?: string; // 로그인 사용자의 Firebase UID
isAnonymous: boolean; // 비회원 변환 여부
}
```

`packages/shared/src/job-types.ts` 또는 `index.ts`의 응답 타입에도 반영(필요한 경우).

#### 4.2.2 업로드 플로우 변경

- `/v1/uploads/initiate`와 `POST /v1/uploads/complete`, `POST /v1/upload`에서:
  - 인증 미들웨어를 **optional**으로 적용합니다. 토큰이 있으면 `userId` 저장, 없으면 `isAnonymous: true`.
  - 즉, **비회원 변환을 유지**하면서 로그인 사용자는 이력에 연결됩니다.

#### 4.2.3 이력 API

- `GET /v1/me/jobs` — 인증 필수. `userId`로 job 목록 조회(시간 역순, 페이지네이션).
- `GET /v1/me/jobs/:jobId` — 인증 필수. 본인 소유 job 상세 조회.
- `GET /v1/jobs/:jobId`는 기존과 동일하게 익명 job도 조회 가능(하위 호환).

#### 4.2.4 삭제 API

- `DELETE /v1/jobs/:jobId`:
  - 인증된 경우: 요청자 `userId`가 `job.userId`와 일치해야 삭제.
  - 익명 job: 현재 구조상 소유자 증명이 불가능하므로, **로그인 사용자만 삭제**로 제한하거나, 업로드 시 별도 `deleteToken`을 발급하는 방식을 도입.
  - 삭제 동작:
    - GCS 모드: 원본 객체(`originalObjectPath`)와 결과 객체(`resultObjectPath`) 삭제.
    - Local 모드: `tmp/uploads`와 `tmp/results`의 해당 파일 삭제.
    - Job record를 hard-delete 하거나 `status: "deleted"`로 마킹하고 `downloadUrl` 제거.
  - 변환 진행 중(`processing`)인 job 삭제 시: 변환 worker는 진행하되 결과 업로드 후 즉시 삭제하거나, worker 내부에서 삭제 플래그를 확인. 더 간단한 방법은 삭제를 **queued/completed/failed/expired 상태에서만 허용**하고, processing 중에는 409 반환.

#### 4.2.5 프론트엔드

- `/jobs` 또는 `/history` 페이지 추가:
  - 로그인 사용자의 변환 목록.
  - 상태, 파일명, 생성일, 만료일, 다운로드 버튼, 삭제 버튼.
- 메인 업로드 컴포넌트(`DropzoneUploader`)에서:
  - 로그인 상태일 때 "이 변환은 내 이력에 저장됩니다" 안내.
  - 비회원일 때 "비회원 변환은 이력에 남지 않습니다" 안내.
- 삭제 버튼 클릭 시 확인 대화상자 후 API 호출, 성공 시 목록/상태 갱신.

#### 4.2.6 보안/배포

- Firestore Security Rules에서 `jobs/{jobId}`:
  - `allow read: if request.auth != null && request.auth.uid == resource.data.userId;`
  - 익명 job은 Admin SDK를 통해서만 접근(rules로 직접 접근 차단).
- Firestore composite index: `userId` + `createdAt` descending.

---

### Phase 3: "페이지 이탈 후에도 변환 계속" 보장

현재 구조상 백엔드에서 비동기 변환하므로 이미 대부분 충족됩니다. 이 Phase에서는 **edge case**를 정리합니다.

1. **GCS 직접 업로드 중 페이지 이탈**:
   - `/v1/uploads/complete`가 호출되지 않으면 job이 생기지 않습니다.
   - 해결책(선택):
     - `beforeunload` 핸들러로 업로드/complete 진행 중이면 경고. 또는
     - `/v1/uploads/initiate` 시점에 **미완료 job** 문서를 생성하고, `/v1/uploads/complete`에서 활성화. 미완료 상태가 일정 시간 지속되면 cleanup worker가 삭제.
2. **변환 worker 실패/중단**:
   - Cloud Run에서 컨테이너 재시작 시 processing 중이던 job은 멈춥니다.
   - 해결책(선택): Cloud Run min-instance 또는 Pub/Sub 기반 비동기 worker 도입. 이는 복잡도가 높으므로 MVP 범위 밖으로 두고 roadmap에 기록.
3. **이력 페이지에서 과거 완료 job 접근**:
   - Firestore에 job metadata를 30분 이상 유지할지 결정.
   - 파일 자체는 GCS lifecycle로 1일 후 삭제되지만, **metadata만 더 오래 보관**할 수 있음.

---

### Phase 4: 회원 전용 게시판

목표: `/board` 경로에 글 목록/상세/작성/수정/삭제 제공, 읽기/쓰기 모두 회원-only.

#### 4.4.1 데이터 모델

`packages/shared/src/index.ts` 또는 `board-types.ts`:

```ts
export interface BoardPost {
  postId: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  category: "notice" | "qna" | "general";
  status: "published" | "deleted";
  createdAt: string;
  updatedAt: string;
}
```

Firestore: `boardPosts/{postId}`.

#### 4.4.2 백엔드

- 의존성: `firebase-admin`은 Phase 1에서 이미 추가됨.
- API routes (`apps/api/src/routes/board.ts`):
  - `GET /v1/board/posts` — 인증 필수, 목록(시간 역순, 페이지네이션, category 필터).
  - `GET /v1/board/posts/:postId` — 인증 필수, 상세.
  - `POST /v1/board/posts` — 인증 필수, 작성.
  - `PATCH /v1/board/posts/:postId` — 인증 필수, 본인 글 수정.
  - `DELETE /v1/board/posts/:postId` — 인증 필수, 본인 글 삭제(soft-delete로 `status: "deleted"`).

#### 4.4.3 프론트엔드

- `/board` — 글 목록 + "새 글" 버튼(로그인 시만 표시, 클릭 시 로그인 필요하면 안내).
- `/board/[postId]` — 상세 보기.
- `/board/new` — 새 글 작성(로그인 필수, 미로그인 시 `/login` redirect).
- `/board/[postId]/edit` — 본인 글 수정(로그인 필수).
- UI: `PageLayout` + Tailwind inline, 기존 카드 스타일 재사용.

#### 4.4.4 보안/배포

- Firestore Security Rules에서 `boardPosts/{postId}`:
  - `allow read: if request.auth != null;`
  - `allow create: if request.auth != null;`
  - `allow update, delete: if request.auth != null && request.auth.uid == resource.data.authorId;`
- Firestore composite index: `category` + `createdAt` descending(필터+정렬 사용 시).

---

## 5. API 엔드포인트 변화 요약

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | /v1/auth/refresh | Optional | 토큰 갱신(선택) |
| GET | /v1/me | Required | 현재 사용자 정보 |
| GET | /v1/me/jobs | Required | 내 변환 이력 |
| GET | /v1/me/jobs/:jobId | Required | 내 특정 job 상세 |
| DELETE | /v1/jobs/:jobId | Required(또는 deleteToken) | job 및 파일 삭제 |
| GET | /v1/board/posts | Required | 게시글 목록 |
| GET | /v1/board/posts/:postId | Required | 게시글 상세 |
| POST | /v1/board/posts | Required | 게시글 작성 |
| PATCH | /v1/board/posts/:postId | Required + owner | 게시글 수정 |
| DELETE | /v1/board/posts/:postId | Required + owner | 게시글 삭제(soft) |

기존 `/v1/uploads/initiate`, `/v1/uploads/complete`, `/v1/upload`, `/v1/jobs/:jobId`, `/v1/results/:fileName`, `/health`는 그대로 유지하되 업로드 엔드포인트는 optional auth를 받도록 수정.

## 6. 새 의존성

- `apps/api`:
  - `firebase-admin`
- `apps/web`:
  - `firebase` (client SDK)
- 선택:
  - `zod`가 이미 있으면 auth 요청/응답 스키마 추가.
  - 날짜 포맷은 Intl.DateTimeFormat 사용(추가 라이브러리 불필요).

## 7. 환경변수/배포 체크리스트

### 7.1 API (Cloud Run / local)

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIRESTORE_*` 값들은 이미 설정되어 있음.

### 7.2 Web (Vercel)

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_ADSENSE_CLIENT`

### 7.3 Firebase Console / GCP

- Authentication → Sign-in method → Email/Password 활성화.
- Firestore Security Rules 업데이트(Phase 2, 4).
- Firestore composite index 추가:
  - `jobs`: `userId` Ascending + `createdAt` Descending
  - `boardPosts`: `category` Ascending + `createdAt` Descending

## 8. 주요 리스크 및 고려사항

1. **익명 job의 삭제 권한 증명**: 현재 `jobId`만으로 조회/다운로드 가능. 삭제까지 허용하면 누구나 URL만으로 삭제할 수 있음. 해결: 삭제는 로그인 사용자만, 또는 `deleteToken` 발급.
2. **비용**: Firebase Auth MAU, Firestore 읽기/쓰기, GCS 삭제 API 호출이 증가.
3. **보안 규칙 복잡도**: 익명 job과 회원 job을 동시에 지원하면서 Admin SDK 접근만 허용해야 rules가 복잡해질 수 있음.
4. **변환 worker 실패**: Cloud Run 컨테이너 재시작 시 진행 중 job 중단. 이는 Phase 3에서 개선 대상.
5. **UI 복잡도**: 로그인/회원가입/이력/게시판 페이지 추가로 인해 메인 페이지의 변환 중심 UX가 흐려지지 않도록 Header에 링크만 배치.

## 9. 권장 진행 순서

1. **Phase 1 먼저**: 인증이 다른 모든 기능의 전제.
2. **Phase 2**: 인증이 있어야 이력과 삭제가 의미 있음.
3. **Phase 3**: 큰 코드 변경 없이 edge case 정리 및 문서화.
4. **Phase 4**: 인증이 있어야 게시판 권한 적용 가능.

> 각 Phase는 별도 PR로 분리하여 리뷰/배포하는 것을 권장합니다.

## 10. 검증 기준 (향후 구현 시)

- 회원가입/로그인 후 `GET /v1/me`가 정상 응답.
- 로그인 상태에서 변환 후 `GET /v1/me/jobs`에 job이 포함됨.
- 비회원 변환 시 `GET /v1/me/jobs`는 401.
- 본인이 아닌 사용자의 job 조회/삭제가 403.
- `DELETE /v1/jobs/:jobId` 후 GCS/local에서 객체가 삭제되고 job이 조회 불가능.
- `/board` 글 목록/작성/상세/삭제가 회원-only로 동작.
