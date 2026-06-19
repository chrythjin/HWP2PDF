# Graphify Rebuild - HWP2PDF Knowledge Graph (2026-06-19)

## 背景

이전 graphify 실행은 AST 추출만 실행되어 38개 노드, 27개 엣지, 0개 하이퍼엣지였음 (semantic 추출 미실행). 9개 subagent로 semantic 추출을 시도했으나 `call_omo_agent`가 Write tool 없이 실행되어 chunk_02_sem.json과 chunk_09_sem.json만 생성됨.

## 작업 내용

### 1. 미완성 chunk 재추출

- **chunk_09** (window.svg, 1개 이미지): `look_at` 분석 → 수동 JSON 작성
  - 7개 노드, 7개 엣지, 1개 하이퍼엣지 (window icon SVG 구조)
- **chunk_02** (22개 파일: docs/sessions, docs/superpowers/specs, sources/, wiki/, pnpm-workspace.yaml, log.md): 전체 파일 직접 읽기 → 수동 JSON 작성
  - 55개 노드, 68개 엣지, 3개 하이퍼엣지
  - 주요 추출: HWP2PDF MVP 아키텍처, async job model, conversion worker, upload constraints, session docs

### 2. Python 병합 스크립트 작성

`C:\Users\U-N-00658\AppData\Local\Temp\merge_sem.py`로 모든 chunk_sem.json → graph.json 수동 병합.

### 3. graphify cluster-only 실행

## 결과

| 지표 | 이전 (AST only) | 현재 (AST + Semantic) |
|---|---|---|
| 노드 | 38 | **204** (+166) |
| 엣지 | 27 | **251** (+224) |
| 하이퍼엣지 | 0 | **15** |
| 커뮤니티 | 38 isolates | **61** |
| 추출률 | 0% semantic | **76% EXTRACTED, 23% INFERRED** |
| LLM 토큰 비용 | 0 | 0 |

## 파일 위치

- graph.json: `C:\NEW PRG\HWP2PDF\graphify-out\graph.json` (215KB)
- GRAPH_REPORT.md: `C:\NEW PRG\HWP2PDF\graphify-out\GRAPH_REPORT.md`
- graph.html: `C:\NEW PRG\HWP2PDF\graphify-out\graph.html`
- chunk별 sem.json: `C:\NEW PRG\HWP2PDF\graphify-out\.graphify_chunks\chunk_*_sem.json`

## 查询示例

```
graphify query "How does the HWP to PDF conversion work?"
→ 11개 노드 반환 (Conversion Worker, Plan Documents, KPI 개념 등 연결됨)
```

## 알려진 제한사항

- 61개 커뮤니티 중 46개가 thin (1-2개 노드) - LLM API 키 없어서 커뮤니티 이름 미지정
- chunk_02의 large spec 파일(1000+ 줄 Korean)은 처음 100줄만 읽어서 완전한 개념 추출은 아님
- 수동 추출이므로 graphify의 자동 중복 제거가 적용되지 않음 (Python 병합에서 수동 처리)

## 사용된 도구

- `look_at` (window.svg 1개)
- `read` (22개 파일 직접 읽기)
- PowerShell 스크립트 (chunk_02_sem.json, chunk_09_sem.json 작성)
- Python 병합 스크립트 (9개 sem.json → graph.json)
- `graphify cluster-only` (클러스터링 + 리포트 생성)
