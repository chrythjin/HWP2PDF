# T8 게시판 접근성·삭제 대화상자·이력 파일명 UI

## 요청

게시판 필터/로딩/페이지네이션 접근성, native confirm 대체 삭제 dialog, 파일명 중심 이력 행 표시와 관련 테스트를 구현한다.

## 변경

- `ConfirmationDialog`를 추가하고 게시글 상세 및 이력 삭제에 연결했다.
- dialog에 alertdialog semantics, initial focus, Tab/Shift+Tab focus trap, Escape/Cancel, background protection, trigger focus restore를 적용했다.
- 게시판 category filter에 group label 및 `aria-pressed`, list loading에 `aria-busy`, pagination에 named navigation/current-page context를 적용했다.
- job 응답의 `originalFileName`을 소비해 이력 행에서 파일명을 우선 표시하고, legacy job은 안전한 비어 있지 않은 fallback을 표시한다.
- 삭제 성공/실패 및 기존 T3 상태 분기와 T7 disclosure semantics는 유지했다.

## 검증 증거

- `pnpm --filter web test -- src/app/history/history-page.test.tsx src/app/board/board-page.test.tsx`: 2 files, 52 tests passed.
- `pnpm --filter web test`: 11 files, 130 tests passed.
- `pnpm --filter web lint`: passed.
- `pnpm --filter web typecheck`: passed.
- `pnpm --filter web build`: Next.js 16.2.9 production build passed.
- `pnpm --filter api typecheck`: passed.
- RTL tests cover filter semantics, dialog initial focus/focus trap/Escape/focus restore, confirm/cancel/async failure, filename priority and safe legacy fallback.
- `ocr review`는 저장소 전체 선행 변경을 포함한 스캔 중 120초 제한으로 종료되어 전체 리뷰 통과로 간주하지 않았다.

## 범위 및 잔여 위험

- 기존 작업에서 이미 변경된 API/문서/생성 파일은 되돌리지 않았다.
- 이번 세션에서는 인증 설정을 변경하지 않았다.
- 실제 인증 세션을 요구하는 Playwright 브라우저 증거는 환경상 수행하지 못했으며, jsdom RTL 키보드/접근성 증거와 production build를 확보했다.
