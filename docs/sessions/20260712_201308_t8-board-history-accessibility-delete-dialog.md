# T8: 게시판 접근성, 삭제 dialog, 파일명 중심 이력 UI 개선 — 독립 검증

## 요약

T8 구현이 작업 트리에 이미 존재했다. 본 세션은 코드와 테스트가 acceptance 기준과 일치하는지 독립적으로 판정하고, 누락된 직접 접근성 단정을 보충했다. 소스 코드는 변경하지 않았다.

## 변경 파일

| 파일 | 변경 유형 | 설명 |
|---|---|---|
| `apps/web/src/app/board/board-page.test.tsx` | 수정 | T8 accessibility 테스트 4개 추가 (27→31) |
| `apps/web/src/components/ConfirmationDialog.test.tsx` | 신규 | ConfirmationDialog 직접 테스트 13개 |

## 소스 코드 검증 (변경 없음)

- **Category control** (`board/page.tsx:137-174`): `role="group"` + `aria-label`, 버튼별 `aria-pressed` ✅
- **List busy** (`board/page.tsx:122`): `aria-busy={loadingList}` ✅
- **Pagination** (`board/page.tsx:232-254`): `<nav aria-label>`, `aria-current="page"`, 페이지 문맥 ✅
- **window.confirm 제거**: grep 0건 ✅
- **ConfirmationDialog**: alertdialog, aria-modal, aria-labelledby, aria-describedby, initial focus, Tab/Shift+Tab trap, Escape, cancel, async busy, trigger focus restore, background non-interaction ✅
- **History rows** (`JobHistoryList.tsx:119,132-133`): originalFileName 주 제목, jobId 보조, legacy fallback ✅
- **Unsafe HTML**: 없음 (pre/text 렌더링) ✅
- **UI scope / new dependency**: 범위 내만, 신규 dependency 없음 ✅

## 테스트 보충

### board-page.test.tsx (+4)
1. category filter role=group + aria-label + aria-pressed 초기 상태
2. aria-pressed 토글 (클릭 후)
3. aria-busy fetch 중 true / 완료 후 false
4. pagination nav + aria-current=page + aria-label 페이지 문맥

### ConfirmationDialog.test.tsx (신규 13)
1. open=false 렌더링 없음
2. alertdialog + aria-modal + aria-labelledby + aria-describedby
3. initial focus cancel
4. Tab trap (last→first)
5. Shift+Tab trap (first→last)
6. Escape (not busy) → onCancel
7. Escape (busy) → onCancel not called
8. cancel click → onCancel
9. confirm click → onConfirm
10. busy: disabled + "처리 중..."
11. custom labels
12. trigger focus restore on close
13. backdrop click non-interaction

## 검증

- `pnpm --filter web test`: 12 files / 147 tests pass (기존 130 + 신규 17)
- `pnpm --filter web typecheck`: exit 0
- `pnpm --filter web lint`: exit 0
- `pnpm --filter web build`: Compiled successfully
- LSP diagnostics: 변경 2개 파일 0 errors

## 브라우저 QA 제한

실제 브라우저 QA는 실행하지 않았다. 저장소에 Playwright Node harness/config 또는 `useAuth` runtime fixture가 없어 authenticated browser state를 안전하게 주입할 수 없다. Firebase 설정/credential/token은 변경하지 않는 제약을 준수했다. 대신 RTL로 keyboard/ARIA/async/non-interaction behavioral coverage를 검증했다.

## acceptance 기준 판정

모든 T8 acceptance 기준 충족. 소스 코드는 기존 구현이 이미 충족했고, 테스트 직접 단정을 보충해 "확인한다" 요건을 만족했다.