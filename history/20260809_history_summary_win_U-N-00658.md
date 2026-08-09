# History Summary - 20260809 (win / U-N-00658)

## User Request

문제없이 작동하는 웹사이트를 실제 사용자 경로로 확인하고 정상화

## Changes

- `apps/api/Dockerfile`: 배포 산출물에 `@hwp2pdf/shared` 런타임 패키지를 포함
- `cloudbuild.api-libreoffice.yaml`: 현재 API Dockerfile과 호출자 제공 이미지 태그 사용
- `infrastructure/gcp/gcs-cors.json`: 현재 Vercel 운영 도메인 추가
- `.github/workflows/deploy-api-cloud-run.yml`: 전용 변환기 OIDC 대상, 영속 백엔드 프로젝트 ID, Cloud Tasks 프로젝트/호출 계정, LibreOffice 실행 경로 보존
  - `WEB_ORIGIN` 저장소 변수가 비어도 현재 운영 Vercel 도메인을 CORS 기본값으로 사용

## Before

- 운영 웹 도메인의 API 업로드 사전 요청이 CORS로 차단됨
- 새 API 컨테이너는 `@hwp2pdf/shared` 런타임 모듈을 찾지 못해 기동 실패
- 자동 API 배포는 전용 변환기 대신 API 자신을 작업 대상으로 설정할 수 있었음

## After

- 운영 웹 도메인에 대한 API CORS와 GCS CORS가 허용됨
- 새 API 이미지가 Cloud Build에서 성공하고 Cloud Run 리비전으로 기동됨
- 독립 HWP V5 제어 문서의 익명 업로드 → Cloud Tasks → 전용 변환기 → 보호 다운로드가 완료됐고 결과는 `%PDF-` PDF임
