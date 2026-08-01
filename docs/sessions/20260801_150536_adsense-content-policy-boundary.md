# AdSense 콘텐츠 정책 경계 수정

## 요청

Google 광고가 게시자 콘텐츠가 없거나 부족한 화면, 알림·탐색·행동 전용 화면에 게재될 수 있는 구조를 수정한다.

## 변경

- 루트 레이아웃에서 전역 AdSense 스크립트 로드를 제거했다.
- 명시적 광고 단위가 있는 홈 화면에서만 AdSense 스크립트를 지연 로드한다.
- 광고 클라이언트 환경 변수가 없으면 광고 단위와 스크립트를 모두 렌더링하지 않는다.
- 로그인, 회원가입, 글쓰기, 내역, 게시판, 문의, 개인정보처리방침, 이용약관 화면은 광고 코드를 로드하지 않는다.

## 검증

- `corepack pnpm --filter web typecheck`
- `corepack pnpm --filter web lint`
- `corepack pnpm --filter web test`: 13개 파일, 174개 테스트 통과
- 더미 AdSense 클라이언트 값으로 `corepack pnpm --filter web build`: 12개 라우트 빌드 성공
- 헤드리스 Chrome으로 직접 렌더링:
  - `/`: AdSense 스크립트 및 명시적 광고 단위 확인
  - `/login`, `/signup`, `/board/write`, `/history`, `/board`, `/contact`, `/privacy`, `/terms`: AdSense 스크립트 0개, 광고 단위 0개

## 운영 조건

AdSense 계정의 자동 광고가 활성화되어 있으면 게시자가 지정하지 않은 위치나 SPA 이동 이후 화면에 광고가 주입될 수 있다. 이 구현의 홈 전용 수동 광고 경계를 유지하려면 AdSense 관리 화면에서 사이트의 자동 광고를 비활성화해야 한다.
