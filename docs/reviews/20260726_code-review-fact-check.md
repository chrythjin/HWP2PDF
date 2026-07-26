# 코드 리뷰 사실 검증 보고서

작성일: 2026-07-26 00:34 KST

범위: 현재 작업 트리의 `apps/api`, `apps/web`, `packages/shared` 소스와 범위별 `AGENTS.md`
방법: 최초에는 읽기 전용 코드 대조를 수행했고, 이후 아래 구현·검증 결과를 추가했다.

## 결론

이전 코드 분석의 일부 주장은 사실이나, 경로 traversal, Dropzone optional chaining, Firebase Auth Proxy, Firestore 설정 부족은 현재 코드 기준으로 문제라고 단정할 수 없거나 과장된 평가였다.

## 사실로 확인된 항목

| 항목 | 판정 | 근거 |
| --- | --- | --- |
| 미들웨어 문서와 구현 불일치 | 사실 | `apps/api/src/middleware/AGENTS.md`는 `request.auth.userId`를 언급하지만, 구현은 `apps/api/src/middleware/auth.ts`에서 `request.user.uid`를 사용한다. 라우트도 `request.user`를 일관되게 사용한다. 문서 문제이며 현재 동작 버그는 아니다. |
| Inline 변환의 claim 누락 | 사실, 로컬 개발 모드 한정 | `apps/api/src/services/cloud-tasks-dispatcher.ts`의 inline 분기는 `claimQueuedJobForProcessing` 없이 `convertJobToPdf`를 직접 호출한다. Cloud Tasks worker 경로는 `apps/api/src/routes/v1.ts`에서 claim을 수행한다. 동일 job의 동시 inline 실행은 중복 변환할 수 있다. |
| Firestore stale-job recovery의 중복 cursor parse | 사실, 저위험 dead code | `apps/api/src/services/job-store.ts`의 `FirestoreJobStore.recoverStaleProcessingJobs`는 query builder 내부에서 cursor를 사용한 후, 외부에서 같은 cursor를 다시 parse하고 즉시 `void` 처리한다. 기능 장애가 아니라 불필요 코드다. |
| 중앙 error handler 외부의 raw 오류 로그 | 사실 | `apps/api/src/middleware/error-handler.ts`는 `errorName`만 기록한다. 하지만 `conversion-service.ts`, `cloud-tasks-dispatcher.ts`, `storage-service.ts`는 별도 진단 로그에서 원본 오류 정보 또는 `error.message`를 기록한다. |
| Board store의 backend 설정 결합 | 사실, 설계 결합 | `apps/api/src/services/board-store.ts`는 board 전용 설정이 아니라 `config.jobStoreBackend`로 Memory/Firestore 구현을 선택한다. 이는 고장이라기보다 backend 독립 선택이 불가능한 설계 결합이다. |

## 부분적으로만 사실인 항목

| 항목 | 판정 | 정정 |
| --- | --- | --- |
| 파일 확장자 검사 `slice(-4)` | 부분 사실 | `packages/shared/src/index.ts`는 마지막 4글자로 `.hwp`를 검사한다. 현재 허용 확장자가 `.hwp` 하나라 기능적으로 정상이며 테스트도 이 방식을 검증한다. 길이가 다른 확장자를 추가할 때만 유지보수상 취약해진다. |
| 경로 traversal 위험 | 과장됨 | 업로드 파일명은 `middleware/upload.ts`, `storage-service.ts`, `routes/v1.ts`에서 허용 문자만 남긴 뒤 경로에 사용한다. 현재 사용자 입력으로 path traversal이 가능한 근거는 확인되지 않았다. |
| `path.resolve(job.resultPath)` 위험 | 과장됨 | `routes/v1.ts`의 `job.resultPath`는 URL 파라미터가 아니라 서버가 생성·저장한 JobRecord 값이다. 현재 데이터 흐름만으로 traversal 취약점이 되지 않는다. |
| Board store가 잘못 동작함 | 과장됨 | `jobStoreBackend` 결합은 유연성이 낮지만, 실제 Memory/Firestore 분기 자체는 동작한다. board 컬렉션 이름도 `FIRESTORE_BOARD_POSTS_COLLECTION`으로 별도 설정 가능하다. |
| 변환 오류 raw log | 부분 사실 | 중앙 HTTP error handler는 안전하다. 별도 서비스 로그는 운영 진단 목적이며, 특히 inline 전용 `console.error("Inline conversion failed", error)`가 가장 직접적인 raw 오류 객체 기록이다. |

## 문제로 보기 어려운 항목

| 항목 | 판정 | 근거 |
| --- | --- | --- |
| Dropzone optional chaining 결함 | 문제 아님 | `apps/web/src/components/DropzoneUploader.tsx`의 `rejectedFiles[0]?.errors[0]?.message`는 react-dropzone의 `FileRejection.errors` 배열 계약 안에서 정상이다. 비정상 객체까지 방어하지 않는다는 정도의 스타일 차이다. |
| Firebase Auth Proxy 자체의 결함 | 문제 아님 | `apps/web/src/lib/firebase.ts`의 Proxy는 lazy Firebase Auth 접근용이며 `Reflect.get(..., receiver)`를 올바르게 사용한다. |
| 익명 토큰의 sessionStorage 보관 | 의도된 설계 | `apps/web/src/lib/upload-token.ts`는 탭 범위 sessionStorage, jobId별 키, SSR 및 storage 실패 방어를 사용한다. URL에는 토큰을 넣지 않는다. XSS 시 노출은 일반 웹 보안 경계이지 이 코드만의 결함은 아니다. |
| Firestore 설정 부족 | 거짓 | 프로젝트·DB·jobs 컬렉션은 `config.ts`에 있고, upload session·deletion cleanup·board 컬렉션도 환경변수로 각각 설정 가능하다. |
| API error DTO 오류 | 거짓 | `packages/shared/src/index.ts`의 DTO는 `{ error: { code, message }, message? }`로 일관된다. 웹 UI는 주로 message를 표시하고 HTTP 상태는 `ApiClientError`로 분류한다. |

## 권장 우선순위

1. 미들웨어 AGENTS 문서를 실제 `request.user.uid` 구현에 맞게 정정한다.
2. Inline dispatcher에도 queued-job claim을 적용하거나, inline이 개발 전용이라는 제약을 실행 시점에 더 강하게 보장한다.
3. 서비스별 오류 로그 정책을 정리해 raw message/stack 기록 범위와 redaction 규칙을 명시한다.
4. `recoverStaleProcessingJobs`의 dead cursor parse를 정리한다.

## 구현 결과

2026-07-26에 위 권장 사항 중 다음 네 항목을 구현했다.

| 권장 사항 | 구현 | 검증 |
| --- | --- | --- |
| 미들웨어 문서 정정 | `apps/api/src/middleware/AGENTS.md`를 실제 `request.user.uid` 계약과 optional auth의 무토큰 동작에 맞췄다. | API typecheck 및 전체 API 테스트 |
| Inline claim 적용 | `enqueueConversionJob()`의 inline 경로가 `claimQueuedJobForProcessing()`에 성공한 경우에만 변환을 시작하도록 변경했다. claim을 얻지 못하면 worker endpoint와 동일하게 noop 처리한다. | claim 성공·실패 모두를 검증하는 dispatcher 회귀 테스트 |
| 안전한 오류 로그 | conversion, inline dispatcher, GCS/local 삭제 실패 로그에서 raw `error.message`, stack, 오류 객체를 제거하고 event·jobId·errorName·errorCode만 기록하도록 통일했다. | API typecheck 및 전체 API 테스트 |
| Dead cursor 제거 | `FirestoreJobStore.recoverStaleProcessingJobs()`의 미사용 중복 cursor parse를 제거했다. | API typecheck 및 전체 API 테스트 |

Board store backend 설정 결합은 기능 장애가 아닌 별도 설계 개선 항목이므로 이번 범위에서는 변경하지 않았다.

## 검증하지 않은 범위

- 런타임 Cloud Tasks, Firestore, GCS, LibreOffice, Firebase 외부 서비스 동작
- 실제 배포 환경의 환경변수 및 IAM 설정
- 브라우저 수동 QA
