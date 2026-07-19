# T7 모바일 내비게이션 및 업로드 상태 접근성 검증

- 요청: T7 구현을 독립 검증하고 결함이 있으면 최소 수정
- 변경: `MobileNav`의 disclosure 동작과 불일치한 ARIA menu role 제거; 업로드 progressbar 상태를 실제 drop 경로로 검증하는 a11y 회귀 테스트 추가
- 검증: 지정 테스트 24/24 통과, `pnpm --filter web lint` 성공, `pnpm --filter web typecheck` 성공, 변경 TSX LSP diagnostics 0건
- 범위: T8/T9, Firebase Auth emulator, dependency, deployment는 변경하지 않음

## Audit follow-up

- `MobileNav.test.tsx`에 Enter 키 입력 회귀 테스트를 추가했다.
- 최신 지정 테스트 25/25, web lint, web typecheck를 통과했다.
- Playwright Chromium으로 375x812 anonymous 캡처를 생성했다. authenticated browser fixture는 저장소에 없고 CLI만으로 `useAuth` runtime mock을 주입할 수 없어 authenticated 브라우저 증거는 생성하지 않았다. 제한은 evidence에 명시했으며 Firebase/Auth 설정은 변경하지 않았다.
- `role="menu"`, `role="menuitem"`, `aria-haspopup="menu"`는 재도입하지 않았다.
