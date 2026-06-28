# 2026-06-29 Firebase Admin 인증 수정

## 요청

- 게시판 API가 Firebase 로그인 상태에서도 401을 반환하는 원인을 확인하고 수정.

## 변경

- `apps/api/src/services/firebase-admin.ts`에서 Firebase Admin SDK v14에 맞게 `firebase-admin/app`의 `initializeApp`/`cert`와 `firebase-admin/auth`의 `getAuth`를 사용하도록 수정.
- `verifyIdToken` 메서드를 컨텍스트 없이 떼어 반환하지 않고, 초기화된 `Auth` 인스턴스를 닫힌 함수에서 호출하도록 변경.
- 테스트 격리용 reset에서 cached Auth 인스턴스도 함께 초기화하도록 보정.

## 검증

- `pnpm --filter api typecheck`
- `pnpm --filter api test -- src/services/firebase-admin.test.ts src/middleware/auth.test.ts src/routes/v1.board.test.ts`
- `pnpm --filter api build`
- 실제 Firebase 테스트 사용자를 생성해 ID 토큰으로 `GET /v1/board/posts?page=1` 및 `POST /v1/board/posts` 호출 성공 확인 후 테스트 사용자 삭제.

## 참고

- `ocr review`는 외부 LLM 제공자의 429 rate limit으로 실행 완료되지 못함.
