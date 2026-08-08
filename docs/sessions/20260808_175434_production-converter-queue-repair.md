# 프로덕션 변환 큐 경로 복구 및 검증

## 날짜
2026-08-08

## 문제
프로덕션 HWP 업로드는 성공했지만, 작업이 전용 변환기에서 완료되지 않았다. 초기에는 Cloud Tasks 대상 502와 성공 응답 뒤의 `noop` 상태가 관찰됐다.

## 원인
- 전용 변환기가 공개 API와 다른 이미지 및 런타임 설정을 사용했다.
- 전용 변환기의 Cloud Run 백엔드가 Node/Express HTTP/1.1 서버와 호환되지 않는 `h2c`로 등록돼 프록시 단계에서 502가 발생했다.
- 공개 API와 전용 변환기에 `JOB_STORE_BACKEND` 및 `STORAGE_BACKEND`가 없어서 각각 인메모리 작업 저장소와 로컬 파일 시스템으로 폴백했다. 따라서 Cloud Tasks 요청을 받은 변환기는 공개 API 인스턴스에 생성된 작업과 원본을 찾지 못하고 `noop` 200을 반환했다.
- 업로드 응답 후 인라인 변환을 실행하는 방식은 Cloud Run CPU 보장과 맞지 않았다.

## 해결
- 프로덕션 공개 API와 전용 변환기에 `JOB_STORE_BACKEND=firestore`, `STORAGE_BACKEND=gcs`를 동일하게 적용했다.
- 변환은 Cloud Tasks를 통해 전용 변환기로 전달하도록 운영 구성을 정렬했다.
- 전용 변환기의 이미지와 LibreOffice 경로를 API와 맞추고, `/usr/bin/soffice`를 사용했다.
- 전용 변환기의 Cloud Run 백엔드 프로토콜을 HTTP/1.1로 맞추고 Cloud Tasks 대상 URL 및 OIDC audience를 현 서비스 URL과 정렬했다.

## 실서비스 검증
독립 공개 `pyhwp` 회귀 코퍼스의 `aligns.hwp`를 사용했다.

- 입력 파일: HWP V5/OLE 서명 확인, 16,384바이트
- 경로: 익명 `POST /v1/upload` → Cloud Tasks → 전용 변환기 → `GET /v1/jobs/:jobId` → 보호된 `GET /v1/jobs/:jobId/download`
- 작업 결과: `completed`, 진행률 100
- 다운로드 결과: 36,418바이트, 첫 5바이트 `%PDF-`

## 운영 결론
프로덕션의 정상 변환 경로는 공개 API, Cloud Tasks, 전용 변환기, Firestore, GCS를 공유해야 한다. 이전에 반복된 특정 HWP 입력의 LibreOffice/H2Orestart SIGABRT는 이 운영 경로와 분리된 문서별 호환성 문제로 추적해야 한다.
