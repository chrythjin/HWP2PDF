# 2026-06-29 History Summary (Windows / U-N-00658)

## User Request

- 로그인된 상태에서도 게시판 API가 401을 반환하는 문제의 API 서버 로그와 실제 원인을 확인.

## Changes

- `apps/api/src/services/firebase-admin.ts`를 Firebase Admin SDK v14 ESM API에 맞게 수정.
- 루트 `firebase-admin` import 대신 `firebase-admin/app` 및 `firebase-admin/auth` 모듈을 사용.
- `verifyIdToken`을 메서드 참조로 분리하지 않고 `Auth` 인스턴스에 바인딩된 호출로 실행.
- 변경 전 백업 생성:
  - `history/file-backups/auth.ts_20260629_011654_Windows_U-N-00658`
  - `history/file-backups/firebase-admin.ts_20260629_011718_Windows_U-N-00658`

## Before

- Firebase ID 토큰의 `iss`/`aud`는 `hwp2pdf-499911`로 정상인데, API의 `GET /v1/board/posts?page=1`가 401을 반환.
- `firebase-admin` 루트 import/direct method extraction 구조로 인해 SDK v14 런타임 API와 맞지 않음.

## After

- API 서버가 실제 Firebase ID 토큰을 검증해 게시판 목록 조회와 글 작성 요청에 200 응답.
- 타입체크, 관련 API 테스트, API 빌드 통과.
- 세션 문서 `docs/sessions/20260629_012412_fix-firebase-admin-auth.md`와 문서 인덱스 항목을 추가.

---

## User Request

- HWP→PDF 변환 속도보다 테스트 환경 비용 최소화가 우선이라고 확인하고 이어서 진행 요청.

## Changes

- 라이브 Cloud Tasks 큐 `conversion-queue`를 테스트용 저비용 설정으로 낮춤: 동시 dispatch 1, 초당 dispatch 0.1, 최대 재시도 3.
- 라이브 Cloud Run 서비스 `hwp2pdf-api` 최신 리비전을 저비용 설정으로 낮춤: min instances 0, max instances 1, concurrency 1, timeout 300s.
- `.github/workflows/deploy-api-cloud-run.yml`에 `CLOUD_RUN_MAX_INSTANCES` 기본값 1을 추가해 다음 배포가 max instances 10으로 되돌리지 않게 함.
- `docs/operations/api-cloud-run-runtime.md`에 저비용 테스트 프로필과 Cloud Tasks 큐 설정을 문서화.
- 세션 문서 `docs/sessions/20260629_014200_low-cost-cloud-run-test-settings.md`와 문서 인덱스 항목을 추가.

## Before

- Cloud Tasks 큐가 동시 dispatch 1000, 초당 dispatch 500, 최대 재시도 100으로 테스트 환경치고 과하게 열려 있었음.
- Cloud Run 배포 워크플로가 `--max-instances 10`으로 다음 배포 시 확장 상한을 다시 높일 수 있었음.

## After

- 테스트 환경은 느린 cold start와 직렬 변환을 감수하는 대신 유휴 비용과 burst 비용 위험을 최소화.
- 라이브 API `/health`가 `{"status":"ok"}`를 반환.
- `pnpm --filter api typecheck`와 `git diff --check` 통과.
