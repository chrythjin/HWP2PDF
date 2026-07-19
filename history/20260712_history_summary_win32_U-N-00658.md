# 2026-07-12 History Summary

## User Request
T7. 모바일 회원 내비게이션과 업로드 상태 접근성 개선

## Changes
- PageLayout에 인증 사용자용 MobileNav 통합
- MobileNav 신규 컴포넌트: 햄버거 트리거, aria-expanded/controls/haspopup, usePathname 기반 aria-current, Escape 닫기, Tab 포커스 트랩, trigger focus restoration
- DropzoneUploader에 progressbar role 및 aria-valuemin/max/now/text 추가
- DropzoneUploader에 role=status + aria-live=polite live region 추가
- DropzoneUploader와 PageLayout의 장식용 SVG에 aria-hidden=true 추가
- MobileNav 및 DropzoneUploader 접근성 회귀 테스트 추가
- 기존 board/history 테스트의 next/navigation mock에 usePathname 추가
- 브라우저 QA 증거 및 세션 문서 추가

## Before
- 모바일(375px) 인증 사용자는 데스크톱 내비게이션이 hidden 처리되어 홈/이력/게시판 접근 경로가 없었음
- 업로드/변환 진행률 바에 progressbar ARIA 시맨틱이 없었음
- 상태 변경을 스크린 리더에 알리는 live region이 없었음
- 장식용 SVG가 assistive technology에 노출될 수 있었음

## After
- 인증 사용자 모바일 내비게이션이 키보드/Enter/Tab/Escape로 조작 가능
- 현재 라우트가 aria-current=page로 표시됨
- 메뉴 닫힘 시 햄버거 트리거로 포커스 복원
- 업로드/변환 진행 상태가 progressbar와 polite live region으로 제공됨
- 장식용 SVG는 aria-hidden=true로 숨김

## Verification
- Focused tests: MobileNav 14/14, DropzoneUploader a11y 9/9
- Full web tests: 126/126
- `pnpm --filter web lint`: clean
- `pnpm --filter web typecheck`: clean
- `pnpm --filter web build`: success
- Playwright browser QA: 375x812, 768x1024, 1280x800 captured

---

## User Request (T8)
T8. 게시판 접근성, 삭제 dialog, 파일명 중심 이력 UI 개선 — 기존 구현 독립 검증 및 누락 보충

## Changes (T8)
- `apps/web/src/app/board/board-page.test.tsx`: T8 accessibility 테스트 4개 추가 (role=group+aria-label+aria-pressed, aria-pressed 토글, aria-busy fetch 중/완료 후, pagination nav+aria-current+aria-label)
- `apps/web/src/components/ConfirmationDialog.test.tsx`: 신규 파일, ConfirmationDialog 직접 테스트 13개 (alertdialog, aria-modal, aria-labelledby, aria-describedby, initial focus, Tab/Shift+Tab trap, Escape busy/no-busy, cancel/confirm, busy disabled, custom labels, trigger focus restore, backdrop non-interaction)

## Before (T8)
- 기존 T8 소스 구현은 acceptance 기준 충족했으나, 접근성 속성(aria-pressed, aria-busy, aria-current, aria-modal, aria-labelledby) 직접 단정이 테스트에 없었음
- codegraph가 ConfirmationDialog에 covering test 없음을 보고

## After (T8)
- 12 files / 147 tests pass (기존 130 + 신규 17)
- typecheck/lint/build exit 0
- 변경 2개 파일 LSP diagnostics 0건
- 소스 코드 변경 없음 (기존 구현이 acceptance 충족)

## Verification (T8)
- `pnpm --filter web test`: 12 files / 147 tests pass
- `pnpm --filter web typecheck`: exit 0
- `pnpm --filter web lint`: exit 0
- `pnpm --filter web build`: Compiled successfully
- LSP diagnostics: ConfirmationDialog.test.tsx 0, board-page.test.tsx 0
- 브라우저 QA 미실행: Playwright harness/useAuth fixture 부재, Firebase 설정 변경 금지
