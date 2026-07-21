# Firestore 보안 규칙 잠금 설정

- Firebase 클라이언트 규칙 만료 알림에 대응하기 위해, 모든 클라이언트의 직접 읽기/쓰기를 차단하도록 `firestore.rules` 파일을 작성하고 `firebase.json`에 규칙 파일을 등록했다.
- 이 프로젝트는 백엔드 API 서버(`apps/api`)에서 Firebase Admin SDK를 사용해 Firestore를 조작하므로 웹사이트 운영과는 무관하게 안전하게 잠글 수 있다.
