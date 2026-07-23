# 전체 코드 검토 및 lease·purge 보정

## 결과

- 직접 업로드 완료의 익명 access token 전달 누락을 수정했다.
- 만료 upload session의 완료 수락을 차단하고, multipart 실패 시 임시 파일 정리를 best-effort로 수행하되 원래 API 오류를 보존했다.
- board 런타임 입력과 Express JSON `null` 경계를 422 응답으로 통일했다.
- 회원 metadata 보존기한을 목록·상세·상태·두 다운로드 경로·삭제 경로에서 강제하고, 만료 metadata와 tombstone을 유지보수 작업이 실제로 물리 삭제하도록 연결했다.
- upload cleanup과 job deletion을 5분 lease 기반 claim으로 변경했다. crash 또는 부분 실패 뒤 유지보수가 lease를 재획득할 수 있으며 stale claim은 finalize할 수 없다.
- 삭제 cleanup payload는 private `JobDeletionCleanupRecord`에 보관한다. public tombstone에는 object path, filename, access token hash, 원본 job payload를 남기지 않으며 부분 삭제 실패 시 live job을 복원하지 않는다.
- 완료 claim은 exact claim ID로 fencing하고 완료 upload session의 민감 payload를 즉시 제거했다. dispatch 전후 crash로 남은 queued job은 유지보수가 재등록한다.
- public tombstone TTL을 private cleanup 진행 상태와 분리하고, Firestore의 metadata/tombstone purge 후보를 실제 보존기한으로 전역 정렬해 작은 batch에서도 어느 클래스도 starvation되지 않게 했다.
- dependency 보안 패치를 좁게 적용하고 root `pnpm.overrides`로 취약한 전이 의존성을 교정했다.

## 검증

- 전체 테스트: shared 47, API 389, web 174, 총 610개 통과.
- `pnpm -r lint` 통과.
- `pnpm -r build` 통과: shared, API, Next.js 16.2.11 production build.
- `pnpm audit --prod`: 알려진 취약점 0건.
- 빌드된 Express 실제 표면: `/health` 200, JSON `null` board 요청 422.
- 빌드된 Next 실제 표면: `/` 200, 존재하지 않는 route 404.
- 빌드된 저장소 모듈 실제 실행: `claimed → in_progress → lease 만료 재획득 → finalize → physical purge` 확인.
- 빌드된 Firestore 저장소 모듈 실제 실행: `limit=1`에서 더 오래된 tombstone을 먼저 purge하고 다음 호출에서 metadata를 purge해 잔여 0건 확인.
- 최종 독립 재검토: Critical 0, High 0, Medium 0.
- TypeScript LSP는 이 환경에 설치되어 있지 않아 진단을 실행할 수 없었다. 대신 API TypeScript `--noEmit`, 전체 build, 전체 테스트로 대체 검증했다.
- 최종 Firestore purge 공정성 변경은 `history/file-backups/20260724_052000_firestore-purge-fairness.md`에 직전·현재 source context와 회귀 계약으로 백업했다.

## 알려진 비제품 이슈

- root `pnpm test`는 Windows에서 script 내부의 bare `pnpm`을 찾지 못한다. 동일 테스트를 Corepack의 pnpm 8.15.1로 `pnpm -r test` 실행해 전부 통과했다.
- `git diff --check`는 이번 작업과 무관한 기존 `.serena/project.yml` trailing whitespace 때문에 실패한다. 해당 파일은 수정하지 않았다.
