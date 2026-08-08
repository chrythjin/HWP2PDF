# History Summary - 20260808 (win / U-N-00658)

## User Request
웹사이트에 광고 안나오고 변환 안되는 문제 확인해줘 직접 사이트 접속해서

## Changes
- apps/web/next.config.ts: CSP connect-src를 동적 생성으로 변경
  - API origin (NEXT_PUBLIC_API_BASE_URL) 자동 추가
  - AdSense SODAR 엔드포인트 (ep1.adtrafficquality.google) 추가

## Before
- CSP connect-src가 정적 문자열로 API 도메인 누락
- AdSense SODAR 엔드포인트 누락
- 변환 시도 시 CSP 위반으로 fetch() 차단
- 광고 SODAR config 요청 차단

## After
- buildCsp() 함수가 빌드 타임 환경변수 기반으로 CSP 생성
- API 도메인 자동 포함
- SODAR 엔드포인트 포함
- 커밋: 91eff31

---

## User Request
프로덕션 HWP 변환 실패를 실제 서비스 경로로 진단하고 복구

## Changes
- Cloud Run 공개 API와 전용 변환기에 동일한 영속 백엔드 설정 적용
  - `JOB_STORE_BACKEND=firestore`
  - `STORAGE_BACKEND=gcs`
- 공개 API에서 Cloud Tasks를 통해 전용 변환기로 작업을 전달하도록 운영 구성을 정렬
- 전용 변환기의 이미지, LibreOffice 실행 경로(`/usr/bin/soffice`), HTTP/1.1 백엔드 프로토콜, Cloud Tasks 대상 URL/OIDC 대상을 API 계약과 정렬
- 독립 `pyhwp` 회귀 코퍼스의 HWP V5/OLE 입력(`aligns.hwp`)으로 공개 익명 업로드, 상태 조회, 보호 다운로드를 실제 실행

## Before
- 프로덕션 API와 전용 변환기가 인메모리 작업 저장소와 로컬 파일 시스템으로 폴백하여 작업 상태와 원본 파일을 공유하지 못함
- Cloud Tasks가 전용 변환기에서 `noop` 200 또는 프록시 502를 반환해 변환이 완료되지 않음
- 인라인 변환은 업로드 응답 후 Cloud Run CPU 보장이 없어 안정적인 변환 경로가 아니었음

## After
- 공개 API가 작업을 Firestore/GCS에 저장하고 Cloud Tasks가 전용 변환기에 전달함
- 전용 변환기가 동일한 Firestore/GCS 상태를 읽고 변환 결과를 저장함
- 독립 HWP V5/OLE 문서가 `completed`(진행률 100)로 종료됨
- 보호 다운로드 결과는 36,418바이트이며 PDF 매직 바이트 `%PDF-`를 확인함
