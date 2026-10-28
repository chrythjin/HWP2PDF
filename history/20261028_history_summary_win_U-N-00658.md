# History Summary - 20261028 (win / U-N-00658)

## User Request

웹사이트 작동 안되던데 문제 원인 파악해봐 -> 진행해

## Cause

- **Cloud Run API의 CORS 차단**:
  - 실제 운영 Vercel 도메인은 `https://hwp2pdf-six.vercel.app`이나, Cloud Run API(`hwp2pdf-api`)의 `CORS_ORIGIN` 환경변수가 구버전 도메인 `https://hwp2pdf-phi.vercel.app`으로 설정되어 있었음.
  - 브라우저의 preflight OPTIONS 요청이 500 에러를 반환하며 브라우저 단에서 모든 API 요청이 전면 차단됨.
- **GitHub Secret `WEB_ORIGIN`의 구 도메인 고착**:
  - GitHub Actions Secret `WEB_ORIGIN`에 2026-06-19에 등록된 구 도메인이 저장되어 있어, 8월 29일 배포 시 API 서비스의 환경변수가 이전 도메인으로 덮어씌워졌음.

## Changes

- `hwp2pdf-api` Cloud Run 서비스의 `CORS_ORIGIN`을 `https://hwp2pdf-six.vercel.app`으로 업데이트 (Revision: `hwp2pdf-api-00082-bhk`).
- GitHub Secret `WEB_ORIGIN`을 `https://hwp2pdf-six.vercel.app`으로 갱신하여 향후 배포 시에도 정상 도메인이 유지되도록 조치.
- 세션 노트(`docs/sessions/20261028_101800_production-cors-and-converter-repair.md`) 및 `docs/INDEX.md` 업데이트.

## Verification

- `OPTIONS /v1/uploads/initiate` 사전 요청이 `204 No Content` 및 `Access-Control-Allow-Origin: https://hwp2pdf-six.vercel.app`으로 응답함을 확인.
- 브라우저 Origin(`https://hwp2pdf-six.vercel.app`)을 포함한 전체 변환 흐름(Initiate -> GCS PUT -> Complete -> Cloud Tasks -> Converter -> Polling -> Completed 100%)을 실제 HWP 제어 문서로 검증 완료.
