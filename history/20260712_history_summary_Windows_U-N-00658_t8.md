# 2026-07-12 T8 History Summary

## User Request

게시판 접근성, 삭제 dialog, 파일명 중심 이력 UI 개선 및 테스트/검증.

## Changes

- 게시판 category group/`aria-pressed`, loading/`aria-busy`, pagination navigation/current-page semantics를 보강했다.
- `ConfirmationDialog`를 추가해 게시글·이력 삭제의 native confirm을 대체했다.
- original filename 우선 표시 및 legacy safe fallback을 추가했다.
- board/history RTL 키보드·삭제·파일명 회귀 테스트를 추가/보강했다.

## Before

- 삭제가 native `window.confirm`에 의존했고, 게시판 및 이력 UI가 보조기기에 충분한 선택/페이지/로딩 맥락을 제공하지 않았다.
- 이력 행이 파일명보다 job ID 중심이거나 legacy 응답에서 안전한 표시값이 없었다.

## After

- 접근 가능한 재사용 dialog가 초기 포커스, focus trap, Escape, 취소/확인, 배경 보호, trigger focus 복귀를 제공한다.
- 파일명이 있으면 우선 표시하고 없으면 `파일명 없는 변환 작업`을 표시한다.
- web 전체 130개 테스트, lint, typecheck, production build가 통과했다.
