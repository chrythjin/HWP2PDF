## User Request
T3. 이력·업로드 UI가 오류·빈 상태·다운로드 상태를 정확히 표현 - 브라우저 QA 수행 및 firebase.ts Auth Emulator 연결 추가

## Changes
- pps/web/src/lib/firebase.ts: connectAuthEmulator import 추가 및 NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST 환경 변수 기반 emulator 연결 로직 추가
- .omo/evidence/task-3-browser-qa.cjs: Playwright 브라우저 QA 스크립트 작성
- .omo/evidence/task-3-screenshot-*.png: 8개 브라우저 QA 스크린샷
- irebase.json: Auth Emulator 설정 임시 추가 (백업 후 복구 예정)

## Before
- firebase.ts가 connectAuthEmulator를 호출하지 않아 로컬 개발/테스트 환경에서 Firebase Auth Emulator를 사용할 수 없었음
- T3 브라우저 QA 증거가 없었음

## After
- NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST 환경 변수 설정 시 자동으로 Auth Emulator에 연결
- 11개 브라우저 QA 테스트 모두 PASS: 미인증, 로그인, API 500 오류, 재시도→성공, completed-but-unavailable, stale refresh, 401 auth-error
- 99개 단위 테스트, typecheck, lint 모두 통과

## T3 Correction (post-independent-verification)
- Reverted firebase.ts to pre-T3 state (removed connectAuthEmulator import and emulator host branch)
- Fixed malformed-JSON defect in history/page.tsx: 200 + non-array/malformed JSON now shows error/stale, not false empty
- Added 4 regression tests for malformed 200 responses
- Verified firebase.json is pre-existing untracked file, content restored to original
- Final: 103/103 tests pass, typecheck/lint clean, browser QA 5/5 PASS

## User Request
T4 stuck 작업 및 만료 업로드 세션 복구 primitive의 batch, transaction cutoff, opaque cursor pagination, exact cleanup authorization 결함 수정

## Changes
- `apps/api/src/services/job-store.ts`: versioned base64url maintenance cursor, strict decoding, transaction scan-key revalidation, exact upload cleanup identity/path revalidation 추가
- `apps/api/src/services/job-store.maintenance.test.ts`: batch, race, cursor ambiguity/malformed input, rejected page candidate, terminal/deleted exclusion, repeated expiry, foreign object protection 회귀 테스트 추가
- `.omo/evidence/task-4-code-frontend-improvement-final.md`: RED/GREEN, diagnostics, limitations, cleanup receipt append

## Before
- 커서가 `timestamp|id` 원문 결합이라 모호하고 malformed cursor를 묵인함
- 세션 scan 이후 transaction 전 owner/objectPath가 바뀌어도 변경된 객체가 cleanup 후보로 방출될 수 있었음
- stale job transaction이 scan 시점 정렬 키와 현재 문서의 동일성을 강제하지 않았음

## After
- cursor는 `[version,timestamp,id]` opaque tuple이며 잘못된 cursor는 명시적으로 거부됨
- stale worker update와 upload owner/path mutation은 transaction 재읽기에서 후보 자격을 잃음
- API 전체 302/302 테스트, typecheck, build, 변경 파일 LSP diagnostics 통과

## User Request
T4 독립 검토에서 발견된 완료 후 cleanup claim 경쟁 결함을 Memory와 Firestore에서 transaction-safe하게 수정

## Changes
- `apps/api/src/services/job-store.ts`: 공통 cleanup eligibility(`expired`, no `completedAt`, no prior claim)를 Memory/Firestore 최종 claim에 적용
- `apps/api/src/services/job-store.maintenance.test.ts`: 만료 스캔 후 완료 시각/완료 상태가 생긴 Memory·Firestore claim 거부 및 Firestore zero-write 회귀 테스트 추가
- T4 learnings/evidence와 세션 문서에 RED/GREEN 및 환경 검증 한계를 기록

## Before
- 만료 후보가 스캔된 뒤 `completedAt`이 생겨도 `status=expired`이면 최종 claim이 성공하여 T5가 완료 객체를 삭제할 수 있었음

## After
- 최종 claim transaction이 완료 여부와 one-time claim 상태를 현재 snapshot에서 재검증하며 기존 여섯 identity 필드를 그대로 비교함
- RED 2/18 실패를 확인한 뒤 집중 18/18, API 전체 311/311, API build, 수정 TypeScript 파일 진단 통과
- Firestore emulator/production conflict retry는 실행하지 않았고 mocked transaction precondition만 검증함
