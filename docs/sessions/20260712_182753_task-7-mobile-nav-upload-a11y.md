# T7 모바일 회원 내비게이션과 업로드 상태 접근성 개선

## 범위
인증 사용자의 모바일 내비게이션과 업로드/변환 상태의 보조공학 접근성을 개선했다. 데스크톱 내비게이션, 인증 체계, T3 상태 계약, Firebase 설정, 게시판 UI는 변경하지 않았다.

## 구현
- `MobileNav`를 추가해 인증 사용자에게만 모바일 메뉴를 제공한다.
- 메뉴 트리거에 `aria-expanded`, `aria-controls`, `aria-haspopup`을 적용했다.
- `usePathname` 기반으로 현재 페이지에 `aria-current="page"`를 적용했다.
- Tab 포커스 트랩, Escape 닫기, 닫힘 후 트리거 포커스 복원을 구현했다.
- 업로드/변환 진행 상태에 progressbar ARIA 속성과 polite live region을 추가했다.
- 순수 장식 SVG를 `aria-hidden="true"`로 숨겼다.

## 검증
- MobileNav 회귀 테스트 14/14 통과
- DropzoneUploader 접근성 테스트 9/9 통과
- 전체 웹 테스트 126/126 통과
- ESLint 및 TypeScript typecheck 통과
- Next.js production build 성공
- Playwright Chromium으로 375x812, 768x1024, 1280x800 캡처 및 상태 확인 완료

상세 증거: `.omo/evidence/task-7-code-frontend-improvement-final.md`
