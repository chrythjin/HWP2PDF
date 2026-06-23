# 사용자가 직접 준비할 일

이 문서는 HWP2PDF를 실제 배포/운영하기 위해 사용자가 직접 준비해야 하는 항목만 쉽게 정리한 체크리스트입니다. 코드는 에이전트가 계속 진행할 수 있지만, 계정 권한과 외부 서비스 값은 사용자가 준비해야 합니다.

## 1. GCP 프로젝트 준비

- [ ] GCP 프로젝트 하나를 정합니다.
- [ ] 결제를 활성화합니다.
- [ ] 아래 API를 켭니다:
  - [ ] Cloud Run
  - [ ] Cloud Build
  - [ ] Artifact Registry
  - [ ] Cloud Storage
  - [ ] Firestore
  - [ ] Cloud Tasks
  - [ ] Firebase Authentication
  - [ ] IAM
- [ ] GCS 버킷 이름을 정하거나 새 버킷을 만듭니다.
- [ ] `infrastructure/gcp/gcs-cors.json`의 `origin`을 실제 Vercel 도메인으로 바꾸고 CORS 설정을 적용합니다.

## 2. Cloud Run 실행 권한 준비

- [ ] Cloud Run API가 사용할 서비스 계정을 정합니다.
- [ ] 그 서비스 계정에 GCS 파일 생성/읽기/삭제 권한을 줍니다.
- [ ] Cloud Run에서 GCS V4 signed URL을 만들 수 있도록 서비스 계정에 필요한 `signBlob` 권한(예: 서비스 계정 Token Creator 권한)을 부여합니다.
- [ ] 그 서비스 계정에 Firestore 읽기/쓰기 권한을 줍니다.
- [ ] 그 서비스 계정에 **Cloud Tasks Enqueuer** 역할을 부여합니다 (변환 작업 큐잉용).
- [ ] GitHub Actions가 Cloud Run에 배포할 수 있도록 Workload Identity 또는 서비스 계정 키를 준비합니다.

## 2-1. Cloud Tasks 워커 호출 권한 준비

- [ ] Cloud Tasks가 API 워커 엔드포인트를 호출할 서비스 계정을 정합니다 (2단계 계정 재사용 가능).
- [ ] 그 서비스 계정에 Cloud Run API 서비스의 **Cloud Run Invoker** 역할을 부여합니다.
- [ ] Cloud Tasks 큐를 생성합니다: `gcloud tasks queues create conversion-queue --location=asia-northeast3`

## 2-2. Firebase Authentication 설정

- [ ] Firebase 콘솔에서 GCP 프로젝트에 Firebase 프로젝트를 연결합니다.
- [ ] Authentication → Sign-in method → Email/Password를 활성화합니다.
- [ ] Firebase 프로젝트 설정에서 클라이언트 config 값(apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)을 복사합니다.
- [ ] (선택) admin/boardModerator custom claims가 필요한 사용자에게 Firebase Admin SDK 또는 CLI로 claims를 부여합니다.

## 3. GitHub 저장소 Secrets/Variables 설정

GitHub 저장소의 Settings → Secrets and variables → Actions에서 아래 값을 등록합니다.

API 배포용:

- [ ] `GCP_PROJECT_ID`
- [ ] `GCP_REGION` 예: `asia-northeast3`
- [ ] `CLOUD_RUN_API_SERVICE` 예: `hwp2pdf-api`
- [ ] `CLOUD_RUN_API_SERVICE_ACCOUNT`
- [ ] `GCS_BUCKET_NAME`
- [ ] `WEB_ORIGIN` 예: 실제 Vercel 웹 주소
- [ ] `GCP_WORKLOAD_IDENTITY_PROVIDER` secret
- [ ] `GCP_SERVICE_ACCOUNT_EMAIL` secret
- [ ] `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` secret (Cloud Tasks 워커 호출용)
- [ ] `CLOUD_RUN_WORKER_AUDIENCE` secret (선택, 기본값: 워커 URL)
- [ ] `CLOUD_TASKS_QUEUE_NAME` variable 예: `conversion-queue`
- [ ] `CLOUD_TASKS_LOCATION` variable 예: `asia-northeast3`
- [ ] `FIRESTORE_JOBS_COLLECTION` variable 예: `jobs`
- [ ] `FIRESTORE_BOARD_POSTS_COLLECTION` variable 예: `boardPosts`

Web 배포용:

- [ ] `VERCEL_TOKEN`
- [ ] `VERCEL_ORG_ID`
- [ ] `VERCEL_PROJECT_ID`
- [ ] `NEXT_PUBLIC_API_BASE_URL` 예: Cloud Run API 주소
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`

## 4. Vercel 프로젝트 연결

- [ ] Vercel에서 GitHub 저장소를 연결합니다.
- [ ] frontend root를 `apps/web`으로 맞춥니다.
- [ ] `NEXT_PUBLIC_API_BASE_URL` 환경변수를 Cloud Run API 주소로 설정합니다.
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY` 환경변수를 Firebase apiKey로 설정합니다.
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` 환경변수를 Firebase authDomain으로 설정합니다.
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` 환경변수를 Firebase projectId로 설정합니다.
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` 환경변수를 Firebase storageBucket으로 설정합니다.
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` 환경변수를 Firebase messagingSenderId로 설정합니다.
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID` 환경변수를 Firebase appId로 설정합니다.

## 5. 실제 변환 검증 방법 선택

현재 개발 PC에는 Docker가 없어서 로컬에서 Cloud Run 컨테이너를 직접 빌드/실행 검증할 수 없습니다. 아래 둘 중 하나가 필요합니다.

- [ ] Docker Desktop 설치 후 로컬에서 API image build/run 검증
- [ ] 또는 GitHub Actions/Cloud Run 배포 권한을 먼저 설정하고 원격 배포로 검증

## 6. 운영 정책 결정

- [ ] 최종 웹 도메인
- [ ] API 공개 범위: 완전 공개 / 토큰 보호 / Cloud Run IAM 보호 중 선택
- [ ] 업로드 제한 유지 여부: 현재 `.hwp`만, 20MB 이하
- [ ] 파일 보관 시간 유지 여부: 현재 30분 (비회원), 회원 metadata 30일
- [ ] 회원 삭제 tombstone 보관 기간: 현재 30일
- [ ] 게시판 admin/boardModerator custom claims 부여 대상 사용자 결정
- [ ] Cloud Tasks 큐 재시도 정책: max-attempts, max-backoff 등 검토

## 에이전트가 계속 진행할 수 있는 일

- 보안/rate limit 구조 개선
- Cloud Run/Vercel workflow 보강
- 운영 문서 정리
- 실제 배포 후 로그 기반 오류 수정
