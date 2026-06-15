# Session: 2026-06-13 — llmwiki MiniMax provider 시도 (사용자 중단)

## 작업 요약

1. **API 키 질문 해결** — `llmwiki compile`이 `ANTHROPIC_API_KEY`를 요구하는 것을 확인 후, `LLMWIKI_PROVIDER`로 다른 프로바이더 전환 가능함을 소스코드에서 확인.
2. **지원 프로바이더 식별** — `llm-wiki-compiler` `dist/cli.js` line 3485에서 `SUPPORTED_PROVIDERS`를 `["anthropic", "claude-agent", "openai", "ollama", "minimax", "copilot"]`로 확인. `MiniMaxProvider`는 line 3273에 정의되어 있으며 `MINIMAX_API_KEY` 환경변수가 필요.
3. **API 키 출처 확인** — OpenCode auth 저장소에 `minimax-coding-plan` 자격 증명이 존재함을 확인. 비밀값 자체는 이후 작업에서 다시 문서화하거나 로그에 남기지 않도록 해야 함.
4. **부분 컴파일 실행** — MiniMax provider로 `llmwiki compile` 실행. 5개 소스 중 첫 번째(`agents.md`) 처리 중 8개 컨셉 페이지 생성 후 사용자가 중단.
5. **마무리** — 중단된 잠금 파일 정리 및 본 세션 문서 작성.

## 검증된 사실

- **프로바이더 설정 방법**: `LLMWIKI_PROVIDER` 환경변수로 프로바이더 전환, `LLMWIKI_MODEL`로 모델명 오버라이드. 키는 프로바이더별 환경변수 (`MINIMAX_API_KEY`, `OPENAI_API_KEY` 등).
- **MiniMaxProvider 위치**: `node_modules/llm-wiki-compiler/dist/cli.js` line 3273 (`MiniMaxProvider extends OpenAIProvider`).
- **지원 프로바이더 전체 목록**: anthropic, claude-agent, openai, ollama, minimax, copilot.
- **현재 부분 결과물**: `wiki/concepts/`에 8개 마크다운 파일 생성됨 (agents.md에서 추출):
  - agentsmd-pattern.md
  - hwp-file-upload-constraints.md
  - hwp2pdfshared-package.md
  - llm-wiki-repository-structure.md
  - nextjs-16-frontend.md
  - nextjs-frontend-application.md
  - pnpm-workspace-configuration.md
  - shared-typescript-contracts.md
- **인덱스 미생성**: `wiki/index.md`는 컴파일이 중단되어 생성되지 않음.

## 핵심 발견 / 의사결정

- **컴파일 속도**: 1개 소스 처리에 약 16분 소요 (실측). 5개 소스 + 임베딩/인덱스까지 완료하려면 매우 오래 걸림. 사용자가 직접 실행하기에 부담스러운 속도.
- **잠재적 해결책** (다음 세션 검토 후보):
  1. `--review` 모드로 candidates만 생성하고 나중에 적용
  2. `LLMWIKI_MODEL`을 더 작은 모델로 (소스 코드 기본값 사용)
  3. 소스 파일을 줄여서 단계별 처리
  4. `llmwiki refresh`로 변경된 부분만 재컴파일

## 미완료 / 후속 작업

- [ ] `wiki/concepts/`의 8개 파일은 남겨둘지 삭제할지 사용자 결정 필요
- [ ] `wiki/index.md`가 없어서 `llmwiki view`로 위키 탐색 불가
- [ ] 4개 남은 소스(blueprint, plan-v1, index, llm-wiki-init) 미처리
- [ ] `--review` 모드 또는 비동기 백그라운드 실행 검토

## 검증 명령 / 결과

| 명령 | 결과 |
|------|------|
| `llmwiki --help` | 지원 프로바이더 명령어 목록 확인 |
| `llmwiki compile --help` | `--lang`, `--review` 옵션만 노출, 프로바이더 플래그 없음 |
| `llmwiki rules --help`, `llmwiki eval --help`, `llmwiki context --help` | provider 플래그 없음. context는 credentials optional |
| `Select-String -Path "...\llm-wiki-compiler\dist\cli.js" -Pattern "provider"` | `LLMWIKI_PROVIDER` 환경변수로 전환, `minimax` 등 6개 지원 확인 |
| OpenCode auth 저장소 확인 | `minimax-coding-plan` 자격 증명 존재 확인 |

## 변경된 파일

- **신규**: `wiki/concepts/*.md` (8개, 부분 컴파일 산출물)
- **삭제**: `.llmwiki/lock` (중단된 컴파일 잠금)
- **메모리상 변화**: 없음 (env vars 정리됨, 디스크 변경은 위 8개 + lock 삭제만)

## 보안 메모

- 비밀값 자체는 문서에 기록하지 않는다.
- OpenCode auth 저장소에 provider 자격 증명이 존재한다는 사실만 운영 메모로 남긴다. 비밀 저장 방식에 대한 보안 검토는 별도 세션에서 수행한다.
