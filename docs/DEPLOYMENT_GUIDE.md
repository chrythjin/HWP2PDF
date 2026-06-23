# HWP2PDF 배포 설명서 (초보자용)

> 이 문서는 **코드를 처음 인터넷에 올려보는 분**도 따라 할 수 있도록 작성되었습니다.
> 모든 단계를 순서대로 따라 하면 약 1~2시간 안에 실제 서비스가 돌아갑니다.

---

## 📋 전체 그림 먼저 보기

```
당신의 브라우저 (https://hwp2pdf-xxx.vercel.app)
        ↓
   Vercel (홈페이지 호스팅)
        ↓  API 주소로 요청 전달
   Cloud Run (변환 서버)
        ↓  파일 저장/조회
   Google Cloud Storage (파일 창고)
```

**두 군데에 따로 배포합니다:**
1. **Vercel** ← 홈페이지 (Next.js)
2. **Google Cloud Run** ← 변환 API (Express + LibreOffice)

두 군데를 서로 연결하면 사용자가 홈페이지에서 파일을 올리면 자동으로 변환돼서 돌아옵니다.

---

## ⏱️ 예상 소요 시간

| 단계 | 내용 | 소요 시간 |
|---|---|---:|
| 0 | 사전 준비 (계정 만들기) | 15분 |
| 1 | Google Cloud 프로젝트 만들기 | 20분 |
| 2 | Cloud Run API 배포 | 20분 |
| 3 | Vercel 웹 배포 | 15분 |
| 4 | 두 서비스 연결 + 테스트 | 10분 |
| **합계** | | **약 1시간 20분** |

---

# 🚀 Step 0: 사전 준비

## 0-1. 필요한 계정

| 서비스 | 용도 | 비용 | 가입 링크 |
|---|---|---|---|
| **GitHub** | 코드 저장소 | 무료 | https://github.com |
| **Google Cloud** | API 서버 + 파일 저장소 | 무료 체험 $300 / 소규모 무료 | https://cloud.google.com |
| **Vercel** | 홈페이지 호스팅 | 무료 (Hobby 플랜) | https://vercel.com |
| **Vercel CLI** (선택) | 로컬에서 명령으로 배포 | 무료 | 설치만 하면 됨 |

> **💡 비용 안내**
> - Google Cloud: 신규 가입 시 $300 무료 크레딧 (90일)
> - 소규모 트래픽(월 100만 요청 이하)은 사실상 무료
> - Vercel: 개인용 Hobby 플랜 무료

## 0-2. 내 코드 저장소 위치 확인

HWP2PDF 코드는 다음 위치에 있어야 합니다:
```
GitHub: https://github.com/[내-계정]/HWP2PDF
```
> 만약 아직 GitHub에 없다면 먼저 업로드해야 합니다. 이 가이드에서는 이미 업로드되어 있다고 가정합니다.

---

# ☁️ Step 1: Google Cloud 설정

> **왜 이 단계가 필요한가요?**
> 한/글 → PDF 변환은 **LibreOffice**라는 무거운 프로그램을 실행해야 합니다.
> Vercel(웹 호스팅)에서는 이걸 돌릴 수 없기 때문에, 별도의 서버(Cloud Run)에서 돌립니다.
> 변환한 파일을 잠깐 저장할 **창고(Storage)**도 같이 만들어야 합니다.

## 1-1. Google Cloud 프로젝트 만들기

1. https://console.cloud.google.com 접속
2. 상단 **프로젝트 선택** 드롭다운 → **"새 프로젝트"** 클릭
3. 프로젝트 이름 입력: 예) `hwp2pdf-prod`
4. **만들기** 클릭
5. 약 10초 후 생성 완료 → 만든 프로젝트 선택

> **⚠️ 주의: 결제 계정 연결 필요**
> - 왼쪽 메뉴 → **결제** → 결제 계정 연결
> - 무료 등급(Free Tier)도 결제 계정 연결은 필수

## 1-2. 필요한 API 활성화하기

왼쪽 메뉴 → **API 및 서비스** → **라이브러리** → 아래를 각각 검색해서 **사용 설정** 클릭:

| # | API 이름 | 용도 |
|---|---|---|
| 1 | Cloud Run API | API 서버 실행 |
| 2 | Cloud Build API | Docker 이미지 빌드 |
| 3 | Artifact Registry API | 이미지 저장 |
| 4 | Cloud Storage API | 파일 저장소 |
| 5 | Cloud Firestore API | 작업 상태 저장 |
| 6 | Cloud Tasks API | 비동기 변환 큐 |
| 7 | Firebase Authentication | 회원 인증 (이메일/비밀번호) |
| 8 | Identity and Access Management (IAM) | 서비스 계정 권한 관리 |

> **💡 팁**: 검색창에 한글이 안 먹으면 영어로 검색 (예: "Cloud Run")

## 1-3. 서비스 계정 만들기 (Cloud Run이 사용할 권한)

왼쪽 메뉴 → **IAM 및 관리자** → **서비스 계정** → **"+ 서비스 계정 만들기"**

1. **서비스 계정 세부정보**
   - 이름: `cloud-run-api`
   - ID: `cloud-run-api` (자동)
   - 설명: `HWP2PDF API가 GCS와 Firestore에 접근할 계정`
   - **만들고 계속하기** 클릭

2. **이 서비스 계정에 프로젝트 액세스 권한 부여** (한 줄씩 추가):
   - `Storage Object Admin` — 파일 생성/읽기/삭제
   - `Cloud Datastore User` — Firestore 읽기/쓰기
   - `Service Account Token Creator` — GCS 서명 URL 생성용
   - `Cloud Tasks Enqueuer` — Cloud Tasks 큐에 변환 작업 추가

3. **완료** 클릭

> **⚠️ 이 권한이 없으면 파일 업로드/변환/다운로드가 전부 실패합니다**

## 1-3-1. Cloud Tasks 서비스 계정 (워커 호출용)

Cloud Tasks가 API의 내부 워커 엔드포인트를 호출할 때 사용할 서비스 계정이 필요합니다. 1-3에서 만든 `cloud-run-api` 계정을 재사용하거나 별도 계정을 만들 수 있습니다.

별도 계정을 만드는 경우:
1. 서비스 계정 이름: `cloud-tasks-worker`
2. 권한: **Cloud Run Invoker** — API 서비스 호출용

배포 후 Cloud Run 서비스에 이 계정의 Invoker 권한을 부여해야 합니다 (GitHub Actions 워크플로우가 자동으로 처리).

## 1-4. GCS 버킷 만들기 (파일 창고)

왼쪽 메뉴 → **Cloud Storage** → **버킷** → **"+ 만들기"**

1. **버킷 이름 지정**
   - 전 세계에서 유일해야 함
   - 예: `hwp2pdf-prod-files-2026`
   - **⚠️ 규칙**: 소문자, 숫자, 하이픈만 사용

2. **데이터 저장 위치 선택**
   - 위치 유형: **리전**
   - 리전: `asia-northeast3` (서울) ← 한국 사용자 대상이라서

3. **기본 액세스 권한**
   - **"uniform"** (세분화된 액세스 제어) — **반드시 uniform 선택**
   - ⚠️ public 액세스 방지가 활성화된 상태 유지

4. **나머지는 기본값** → **만들기**

5. 만든 버킷 클릭 → **구성** 탭 → **CORS 구성** → 아래 내용 붙여넣기:

```json
[
  {
    "origin": ["https://hwp2pdf-xxxxx.vercel.app"],
    "method": ["GET", "PUT", "POST"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

> **💡 위 origin은 일단 placeholder입니다. Step 3에서 Vercel 주소를 받은 후 정확한 값으로 교체합니다.**

## 1-5. Firestore 데이터베이스 만들기

왼쪽 메뉴 → **Firestore** → **데이터베이스 만들기**

1. 모드: **Native 모드** 선택
2. 데이터베이스 ID: `(default)` 그대로
3. 위치: `asia-northeast3` (서울)
4. 보안 규칙: **프로덕션 모드** (처음엔 잠금, 나중에 API 키 방식으로 풀 예정이지만 일단 기본)
5. **만들기** 클릭

## 1-6. Firebase Authentication 활성화

> **왜 필요한가요?** 회원가입/로그인/변환 이력/게시판 기능을 사용하려면 Firebase Authentication이 필요합니다. 비회원 변환은 Firebase 없이도 그대로 작동합니다.

1. https://console.firebase.google.com 접속 → **프로젝트 추가** → 1-1에서 만든 GCP 프로젝트 선택
2. Firebase 콘솔 → **Authentication** → **Sign-in method**
3. **Email/Password** 클릭 → **사용 설정** → **저장**
4. Firebase 콘솔 → **프로젝트 설정** (톱니바퀴 아이콘) → **일반** 탭
5. 아래 값들을 복사해두세요 (Step 3에서 Vercel에 등록):
   - `apiKey` → `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `authDomain` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` (보통 `프로젝트ID.firebaseapp.com`)
   - `projectId` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `storageBucket` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `NEXT_PUBLIC_FIREBASE_APP_ID`

> **💡 Firebase 프로젝트와 GCP 프로젝트가 같으면** Firebase Admin SDK가 Cloud Run ADC로 자동 초기화됩니다. 별도 서비스 계정 키 파일이 필요하지 않습니다.

## 1-7. Cloud Tasks 큐 만들기

> **왜 필요한가요?** 변환 작업을 Cloud Tasks 큐에 넣으면 브라우저를 닫아도 변환이 완료됩니다. 페이지 이탈에 안전한 비동기 변환을 보장합니다.

Cloud Shell 또는 로컬 gcloud CLI에서:

```bash
gcloud tasks queues create conversion-queue \
  --location=asia-northeast3 \
  --max-concurrent-dispatches=10 \
  --max-attempts=10 \
  --max-backoff=300s \
  --max-dispatches-per-second=5
```

> **💡 큐 이름과 리전은** GitHub Variables의 `CLOUD_TASKS_QUEUE_NAME`과 `CLOUD_TASKS_LOCATION` 값과 일치해야 합니다. 워크플로우 기본값은 `conversion-queue` / `asia-northeast3`입니다.

---

# 🐳 Step 2: Cloud Run API 배포

> **여기서 하는 일**: 변환 서버(API)를 클라우드에 올립니다.
> GitHub Actions가 자동으로 Docker 이미지를 만들어서 Cloud Run에 배포해줍니다.

## 2-1. Workload Identity 만들기 (GitHub → GCP 안전 연결)

1. 왼쪽 메뉴 → **IAM 및 관리자** → **Workload Identity 풀**
2. **"+ 풀 만들기"** 클릭
3. 설정:
   - 이름: `github-pool`
   - 풀 ID: `github-pool` (자동)
   - **만들고 계속하기** 클릭

4. **공급업체 추가**:
   - 공급업체: **GitHub Actions 선택** (드롭다운에서)
   - 공급업체 이름: `github-actions`
   - **만들기** 클릭

5. 만든 풀 클릭 → **"+ 권한 부여"** 클릭:
   - 서비스 계정: 1-3에서 만든 `cloud-run-api@...` 선택
   - 역할: `roles/iam.workloadIdentityUser`
   - **저장** 클릭

6. **공급업체 ID 확인** (중요! 다음 단계에서 씀):
   - 만든 공급업체(`github-actions`) 클릭
   - **"공급업체 ID"** 복사 → 예: `projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-actions`

## 2-2. GitHub Secrets / Variables 등록

GitHub 저장소 페이지 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** / **New repository variable**

### Secrets (민감한 값, 5개)

| 이름 | 값 | 어디서 복사? |
|---|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | 2-1의 공급업체 ID | 1단계에서 복사한 풀 ID + `/providers/github-actions` |
| `GCP_SERVICE_ACCOUNT_EMAIL` | `cloud-run-api@프로젝트ID.iam.gserviceaccount.com` | IAM에서 확인 |
| `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` | Cloud Tasks 워커 호출용 서비스 계정 이메일 | 1-3-1에서 만든 계정 (같은 계정 재사용 가능) |
| `CLOUD_RUN_WORKER_AUDIENCE` | (선택) 워커 엔드포인트 OIDC audience | Cloud Run 서비스 URL. 비워두면 워커 URL이 자동 사용됨 |

### Variables (공개 값)

| 이름 | 값 예시 |
|---|---|
| `GCP_PROJECT_ID` | `hwp2pdf-prod` (1-1에서 만든 프로젝트) |
| `GCP_REGION` | `asia-northeast3` |
| `CLOUD_RUN_API_SERVICE` | `hwp2pdf-api` |
| `CLOUD_RUN_API_SERVICE_ACCOUNT` | `cloud-run-api@프로젝트ID.iam.gserviceaccount.com` |
| `GCS_BUCKET_NAME` | 1-4에서 만든 버킷 이름 |
| `WEB_ORIGIN` | 일단 `https://example.com` (Step 3 후 Vercel URL로 교체) |
| `CLOUD_TASKS_QUEUE_NAME` | `conversion-queue` (1-7에서 만든 큐) |
| `CLOUD_TASKS_LOCATION` | `asia-northeast3` |
| `FIRESTORE_JOBS_COLLECTION` | `jobs` (기본값) |
| `FIRESTORE_BOARD_POSTS_COLLECTION` | `boardPosts` (기본값) |

## 2-3. 첫 배포 실행

```powershell
# 내 컴퓨터에서 (PowerShell)
git add .
git commit -m "deploy: first cloud run deploy"
git push origin master
```

**그 다음:**
1. GitHub 저장소 → **Actions** 탭
2. **"Deploy API to Cloud Run"** 워크플로우 실행 중인 것 클릭
3. 로그 실시간으로 보기

**예상 흐름:**
1. `preflight` 작업 (10초) — 설정 확인
2. `deploy` 작업 (3-5분) — Docker 빌드 + 푸시 + Cloud Run 배포
3. `Smoke test` 작업 (10초) — health 체크
4. **모두 초록색 ✅** 이면 성공

## 2-4. Cloud Run URL 확인

1. Google Cloud Console → **Cloud Run** → 만든 서비스 클릭
2. 상단에 **URL** 표시됨 — 예: `https://hwp2pdf-api-xxxxx-an.a.run.app`
3. **이 URL을 복사해두세요!** 다음 단계에서 사용합니다.

## 2-5. 간단한 동작 테스트

PowerShell에서:
```powershell
# 헬스 체크
$url = "https://hwp2pdf-api-xxxxx-an.a.run.app"  # 2-4의 URL
Invoke-RestMethod "$url/health"
```

**기대 결과:**
```json
{ "status": "ok" }
```

> **❌ 만약 에러가 나면?**
> - "Service unavailable" → Cloud Run 로그 확인
> - "Permission denied" → 1-3의 서비스 계정 권한 다시 확인
> - "CORS" → 1-4의 CORS 설정에서 origin이 일치하는지 확인

---

# 🌐 Step 3: Vercel 웹 배포

> **여기서 하는 일**: 사용자가 보는 홈페이지를 Vercel에 올립니다.

## 3-1. Vercel 프로젝트 생성

1. https://vercel.com 접속 → GitHub로 로그인
2. **"Add New..."** → **"Project"** 클릭
3. **"Import"** 옆에 있는 HWP2PDF 저장소 클릭 → **"Import"** 클릭

## 3-2. 프로젝트 설정 (중요!)

**프로젝트 설정 화면에서:**

| 항목 | 설정값 |
|---|---|
| **Project Name** | `hwp2pdf` (또는 원하는 이름) |
| **Root Directory** | **`apps/web`** ← 반드시 변경! (Edit 클릭 후 입력) |
| **Framework Preset** | Next.js (자동 감지) |
| **Build Command** | 비워두기 (자동: `next build`) |
| **Output Directory** | 비워두기 (자동) |
| **Environment Variables** | 아래 값 추가 |

**Environment Variables** 섹션에서:
- `NEXT_PUBLIC_API_BASE_URL` = **Step 2-4에서 복사한 Cloud Run URL**
  - 예: `https://hwp2pdf-api-xxxxx-an.a.run.app`
- `NEXT_PUBLIC_FIREBASE_API_KEY` = 1-6에서 복사한 Firebase apiKey
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = 1-6에서 복사한 Firebase authDomain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = 1-6에서 복사한 Firebase projectId
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = 1-6에서 복사한 Firebase storageBucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = 1-6에서 복사한 Firebase messagingSenderId
- `NEXT_PUBLIC_FIREBASE_APP_ID` = 1-6에서 복사한 Firebase appId

> **⚠️ 슬래시(/) 없이 URL만 입력!**
> - ❌ `https://hwp2pdf-api-xxx.run.app/`
> - ✅ `https://hwp2pdf-api-xxx.run.app`

> **💡 Firebase 환경변수는** 회원 기능(로그인/이력/게시판)이 필요할 때만 필수입니다. 비회원 변환만 사용한다면 `NEXT_PUBLIC_API_BASE_URL`만 있어도 됩니다.

**Deploy** 클릭

## 3-3. 배포 진행

약 1-2분 후:
- ✅ 초록색 체크 표시 → 성공
- 화면 상단에 **"Visit"** 버튼 → 클릭하면 내 사이트가 열림

**내 사이트 URL 형태:**
```
https://hwp2pdf-xxxxx.vercel.app
```

이 URL을 **복사**해두세요!

## 3-4. Vercel 토큰 발급 (GitHub Actions용)

1. https://vercel.com/account/tokens 접속
2. **"Create Token"** 클릭
3. 이름: `hwp2pdf-github`
4. Scope: 선택 안 함 (전체 권한)
5. 만료: 원하는 기간 (예: 1년)
6. **생성** 클릭 → **생성된 토큰 문자열 복사** (다시 볼 수 없음!)

## 3-5. Vercel 프로젝트 ID 확인

1. Vercel 대시보드 → **Settings** → **General**
2. **"Project ID"** 값 복사
3. **"Team ID"** (또는 개인 계정이면 본인 User ID) 값 복사

## 3-6. GitHub에 Vercel 시크릿 등록

GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**:

### Secrets (3개 추가)

| 이름 | 값 |
|---|---|
| `VERCEL_TOKEN` | 3-4에서 복사한 토큰 |
| `VERCEL_ORG_ID` | 3-5의 Team ID |
| `VERCEL_PROJECT_ID` | 3-5의 Project ID |

### Variable (공개 값 — Firebase 클라이언트 설정 포함)

| 이름 | 값 |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Cloud Run URL (3-2에서 등록한 값과 동일) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase apiKey (1-6에서 복사) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase authDomain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase projectId |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storageBucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messagingSenderId |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase appId |

> **💡 GitHub Variables에 등록하면** Vercel 배포 워크플로우가 자동으로 Vercel 프로젝트에 동기화합니다. Vercel 대시보드에서 직접 등록해도 됩니다.

## 3-7. 자동 배포 활성화

```powershell
git commit --allow-empty -m "ci: enable vercel auto deploy"
git push origin master
```

GitHub Actions의 **"Deploy Web to Vercel"** 워크플로우 자동 실행됩니다.

> **💡 이 시점부터는**: master 브랜치에 push할 때마다 자동으로 재배포됩니다.

---

# 🔗 Step 4: 두 서비스 연결

## 4-1. GCS CORS에 Vercel URL 추가

Google Cloud Console → **Cloud Storage** → 버킷 → **구성** → **CORS**:

```json
[
  {
    "origin": [
      "https://hwp2pdf-xxxxx.vercel.app",
      "http://localhost:3000"
    ],
    "method": ["GET", "PUT", "POST", "OPTIONS"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

> **💡 localhost는 로컬 개발할 때 필요해서 추가했습니다.**

**저장** 클릭

## 4-2. WEB_ORIGIN 업데이트

GitHub → **Variables** → `WEB_ORIGIN` 수정:
- 값: `https://hwp2pdf-xxxxx.vercel.app` (3-3의 Vercel URL)

## 4-3. API 재배포

```powershell
git commit --allow-empty -m "ci: update web origin"
git push origin master
```

Cloud Run이 새 환경변수로 자동 재배포됩니다.

---

# ✅ Step 5: 최종 확인

## 5-1. 홈페이지 열기

브라우저에서 `https://hwp2pdf-xxxxx.vercel.app` 접속
- ✅ "HWP 문서를 깨끗한 PDF로 변환하세요" 페이지가 보여야 함
- ✅ 업로드 박스가 보여야 함

## 5-2. 실제 변환 테스트

1. 한/글 파일(`.hwp`) 하나 준비
2. 업로드 박스에 드래그 앤 드롭
3. **약 10-30초 대기** → "변환 완료" 메시지
4. **다운로드** 버튼 클릭 → PDF 파일 다운로드

> **🎉 이게 되면 배포 완료입니다!**

## 5-3. 실패 시 디버깅

| 증상 | 원인 | 해결 |
|---|---|---|
| "CORS" 에러 | GCS CORS에 Vercel URL 없음 | 4-1 다시 확인 |
| "Failed to fetch" | API URL 잘못됨 | 3-2의 환경변수 확인 |
| "권한 없음" | 서비스 계정 권한 부족 | 1-3 다시 확인 |
| 페이지가 안 열림 | Vercel 배포 실패 | Vercel 대시보드 로그 확인 |
| 변환이 안 됨 | LibreOffice 에러 | Cloud Run 로그 확인 |

**Cloud Run 로그 보는 법:**
Google Cloud Console → **Cloud Run** → 서비스 → **로그** 탭

---

# 🛠️ 문제 해결 FAQ

### Q1. "403 Forbidden" 에러가 나요
- 서비스 계정의 권한 부족
- IAM에서 `cloud-run-api` 계정에 다음 역할이 있는지 확인:
  - Storage Object Admin
  - Cloud Datastore User
  - Service Account Token Creator

### Q2. "CORS policy: No 'Access-Control-Allow-Origin'" 에러
- 4-1의 CORS 설정이 잘못됨
- 브라우저 DevTools → Network → 응답 헤더에 `Access-Control-Allow-Origin`이 있는지 확인
- 1-4 CORS의 `origin` 값이 **정확한** Vercel URL인지 확인 (https:// 포함, 끝에 `/` 없이)

### Q3. Cloud Run URL이 너무 길어요
- 커스텀 도메인을 연결할 수 있음
- Cloud Run → 서비스 → **도메인 매핑** → **도메인 추가**
- 별도 도메인(예: api.mycompany.com)이 있어야 함

### Q4. 비용이 얼마나 나와요?
- **Vercel**: Hobby 플랜은 무료 (월 100GB 대역폭)
- **Cloud Run**: 첫 200만 요청/월 무료
- **Cloud Storage**: 첫 5GB 무료
- **Firestore**: 첫 1GB 저장 + 일일 20K 읽기 무료
- **소규모 사이트는 사실상 $0** 운영 가능

### Q5. 라이센스 문제 없나요?
- **LibreOffice**: MPL 2.0 (자유 라이센스, 상용 가능)
- **H2Orestart**: **GPL-3.0** (자유이지만, GPL 코드와 함께 배포 시 소스 공개 의무)
  - 자체 SaaS로 제공 시: OK
  - **소프트웨어 형태로 재배포 시: 라이센스 검토 필요**
  - 자세한 건 법무 검토 권장

### Q6. 다른 사람도 쓸 수 있게 하려면?
- Vercel은 기본적으로 **공개 사이트**
- Cloud Run은 `--allow-unauthenticated` 설정이라 누구나 호출 가능
- **rate limit**이 이미 코드에 있음 (시간당 60회)
- 더 강한 보안이 필요하면 Cloud Run IAM 인증으로 전환 가능

---

# 📞 다음 단계

배포가 끝났으면:

1. **커스텀 도메인 연결** (선택): Vercel에서 `mycompany.com` 같은 도메인 연결
2. **모니터링 설정**: Cloud Run → 측정항목 → 알림 설정 (트래픽 급증 시 알림)
3. **백업 정책**: Firestore는 자동 백업 안 됨 → 정기 export 권장
4. **CI/CD 강화**: PR마다 자동 테스트 (이미 Vitest 설정되어 있음)

**더 궁금한 건 이 저장소의 이슈 탭에 남겨주세요!**
