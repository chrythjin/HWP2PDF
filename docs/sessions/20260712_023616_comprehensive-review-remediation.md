# 종합 코드 리뷰 개선

## 요청

2026-07-12 종합 코드 리뷰에서 확인한 14개 문제를 실행 계획으로 구조화하고, 운영 장애 및 데이터 무결성 위험 순으로 개선한다.

## 주요 변경

- 변환 실패를 워커에 재전파하고 일시적 오류는 Cloud Tasks 재시도가 실제로 작업을 다시 claim할 수 있게 `queued` 상태로 복원했다.
- 업로드 응답 전에 큐 등록 결과를 기다리고 실패 시 작업을 `failed`로 기록했다. 직접 업로드 세션도 성공 또는 큐 등록 실패 시 종결한다.
- GCS 원본 경로와 원본 크기를 작업 계약에 보존하고, 워커가 실행 인스턴스의 임시 경로로 재다운로드하면서 크기를 재검증하도록 변경했다.
- 직접 업로드 완료 시 GCS 객체 metadata를 검증하고 HWP v5 OLE 시그니처가 아닌 파일을 거부·정리한다.
- 게시글 PATCH의 각 제공 필드를 독립 검증한다.
- 작업 갱신·삭제와 게시글 수정·삭제를 Firestore transaction으로 보호하고, tombstone에는 인가에 필요한 최소 소유권만 남긴다.
- 회원 다운로드 만료와 30일 메타데이터 만료를 분리했다.
- 회원 이력 Firestore 쿼리에서 `status != deleted` 제약을 제거하고 필터·페이지 처리를 올바른 순서로 수행한다.
- Cloud Run 단일 프록시 홉을 명시하고 rate limit 키를 `request.ip`에서 생성한다.
- HTML 문서 언어를 `ko`로 수정하고 Firestore 복합 인덱스 선언 및 임시 산출물 ignore 규칙을 추가했다.
- smoke fixture를 실제 OLE 헤더 형식으로 갱신했다.
- LibreOffice 자식 프로세스에 240초 기본 실행 제한과 강제 종료를 적용하고 stdout/stderr 수집을 각각 8KiB로 제한했다.
- 게시글 PATCH의 비문자열 JSON 입력을 422 검증 오류로 처리하고, 일반 작업 갱신 타입에서 소유권 필드 변경을 금지했다.
- 잘못된 직접 업로드 시그니처에서도 업로드 세션을 종결하고, 워커의 성공·실패 응답 분기를 명시적으로 종료해 이중 응답을 방지했다.
- 변환 타임아웃과 프로세스 종료가 경합할 때 이미 종료된 프로세스의 강제 종료 예외를 흡수하도록 보완했다.
- 기존에 추적되던 `apps/api/tmp/uploads/*` 81개와 루트 `package-lock.json`을 백업 후 제거했다.

## 검증

- `pnpm test`: 404개 통과.
- `pnpm -r build`: shared, api, web 프로덕션 빌드 통과.
- `pnpm -r --if-present lint`: 웹 ESLint 통과.
- 후속 OCR 지적 반영 후 API 표적 테스트 42개 및 API TypeScript 빌드 통과.
- 변경 핵심 파일 LSP 진단: 오류 없음.
- `git diff --check`: 오류 없음.
- `ocr review`: 14개 변경 파일 검토 완료. 상충·오탐 지적을 코드로 재검증했고, 유효한 업로드 세션 종결과 워커 원본 크기 재검증 누락을 반영했다.
- 실제 로컬 HTTP QA:
  - `GET /health` → 200.
  - 잘못된 HWP 시그니처 업로드 → 422 `invalid_file_signature`.
  - OLE 시그니처 HWP 업로드 → 202 `queued`.
  - 토큰 없이 해당 작업 조회 → 401.
  - QA 프로세스 종료와 포트 해제를 확인했다.
- 실제 GCP 확인:
  - Cloud Run 운영 `/health` → 200.
  - Cloud Tasks 큐가 실행 상태이며 재시도 횟수 3, 동시 디스패치 1로 구성된 것을 확인했다.
  - 회원 이력 복합 인덱스 `ownerType, userId, createdAt, __name__`를 생성하고 `READY` 상태를 확인했다.
  - 최신 Cloud Run 리비전의 실행 계정, 동시성 1, 요청 제한 300초를 확인했다.
- 비문자열 PATCH 드라이버 QA: `title: null`, `body: 42`, `category: null`이 예외 없이 각각 검증 오류를 반환했다.

## 남은 운영 제약

- 소스 변경은 아직 새 Cloud Run 리비전으로 배포하지 않았으므로, Cloud Tasks의 실제 재전달과 다른 리비전 인스턴스에서의 GCS 재다운로드는 배포 후 장애 주입 검증이 필요하다.
- 로컬 Windows 환경에는 LibreOffice가 없으므로 실제 HWP→PDF 성공 변환은 이번 로컬 QA 범위가 아니다.
- 현재 단일 Cloud Run 컨테이너에서 API와 LibreOffice가 네트워크 namespace를 공유한다. LibreOffice만 egress를 차단하려면 별도 변환 서비스 또는 샌드박스 실행환경 분리가 선행되어야 한다.
