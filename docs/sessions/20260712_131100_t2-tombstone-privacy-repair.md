# T2 tombstone privacy repair

- 독립 검증에서 발견된 공개 tombstone 감사 메타데이터 누출과 cross-member tombstone oracle을 수정했다.
- 저장소의 owner/audit 자료는 유지하고 공개 DTO에서만 제거했다.
- 회원 detail/DELETE는 raw tombstone owner가 요청자와 일치할 때만 own-deleted 동작을 반환한다.
- 검증: 집중 45/45, API 전체 293/293, API build 성공, 실HTTP foreign/missing 응답 동등성 및 listener cleanup 확인.
- 독립 재검증 전이므로 T2 완료/승인 상태를 변경하지 않았다.
