# Session: 2026-06-13 — llmwiki source splitting for practical compile runs

## 작업 요약

1. 기존 `sources/hwp2pdf-blueprint.md`, `sources/hwp2pdf-plan-v1.md`처럼 매우 큰 llmwiki source가 interactive compile에 너무 느리다는 점을 반영해, 더 작은 domain-focused source 파일들을 추가했다.
2. `sources/index.md`와 `docs/INDEX.md`에 새로운 분할 source들을 시작점으로 연결했다.
3. 기존 MiniMax 시도 세션 문서에서 비밀 취급상 부적절한 표현을 줄이고, 자격 증명 존재 사실만 남기도록 정리했다.

## 새로 추가한 llmwiki source

- `sources/blueprint-architecture-overview.md`
- `sources/blueprint-conversion-strategy.md`
- `sources/blueprint-async-processing-flow.md`
- `sources/blueprint-security-and-retention.md`
- `sources/plan-scope-and-success-metrics.md`
- `sources/plan-system-components.md`

각 파일은 원본 spec를 대체하는 제품 문서가 아니라, **llmwiki compile latency를 줄이기 위한 derived source**로 명시했다.

## 왜 이 방식이 최선인지

- 대형 spec 원문을 그대로 compile하면 concept extraction과 page generation 호출량이 커져 interactive usage에 부적합하다.
- source를 책임별로 분리하면 변경분 중심으로 incremental compile하기 쉬워진다.
- 비밀값을 다시 읽거나 명령행에 싣지 않고도, repo 안에서 지속 가능한 llmwiki 구조 개선이 가능하다.

## 검증

- 새 source 파일 6개 생성 완료
- `sources/index.md`와 `docs/INDEX.md`에 새 source 링크 반영 완료
- 기존 부분 compile 산출물로 인해 남아 있는 wiki 링크 진단 오류는 이번 변경의 신규 오류가 아니라 기존 partial wiki 상태에서 발생한 것임을 확인
- 보안 관점에서 기존 session note 문구를 수정해 자격 증명 값 재기록을 피함

## 미완료 / 다음 권장 순서

1. 사용자가 로컬 환경에서 필요한 provider env를 직접 설정
2. 작은 source부터 `llmwiki compile` 또는 가능한 incremental 경로 실행
3. 성공 시 기존 대형 source 두 개를 active compile 입력에서 제외할지 결정
4. partial `wiki/` 상태를 유지할지 재생성할지 결정

## 변경 파일

- 신규: `sources/blueprint-architecture-overview.md`
- 신규: `sources/blueprint-conversion-strategy.md`
- 신규: `sources/blueprint-async-processing-flow.md`
- 신규: `sources/blueprint-security-and-retention.md`
- 신규: `sources/plan-scope-and-success-metrics.md`
- 신규: `sources/plan-system-components.md`
- 수정: `sources/index.md`
- 수정: `docs/INDEX.md`
- 수정: `docs/sessions/20260613_012000_llmwiki-minimax-aborted.md`
