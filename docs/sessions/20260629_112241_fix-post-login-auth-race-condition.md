# 로그인 후 인증 실패 Race Condition 수정

**날짜**: 2026-06-29 11:22  
**요약**: 로그인 성공 직후에도 "인증이 안되었다"는 메시지가 표시되는 문제 수정

---

## 문제 현상

로그인에 성공한 직후(또는 페이지 이동 직후) 인증이 필요하다는 에러가 표시됨.
- 변환 이력 페이지, 게시판 등에서 401/403 발생
- 사용자가 로그인 상태인데도 불구하고 API가 인증되지 않은 것으로 판단

## 근본 원인

### 1. AuthProvider login()의 user 상태 미반영

```typescript
// 수정 전
const login = useCallback(async (email, password) => {
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  // signInWithEmailAndPassword 성공 → Firebase 내부 currentUser 갱신됨
  // BUT React 상태(user)는 onAuthStateChanged 콜백이 실행될 때까지 null
  // router.push("/") 실행 시 user가 null인 채로 새 페이지 렌더링
}, []);
```

**시퀀스 문제**:
```
signInWithEmailAndPassword resolve
  → Firebase 내부 currentUser = User (즉시 갱신)
  → router.push("/") 실행 (다음 tick)
  → 새 페이지 렌더링, useAuth().user = null (onAuthStateChanged 미실행)
  → fetchWithAuth(route, null, ...) → Authorization 헤더 없음 → 401
```

### 2. fetchWithAuth의 불안정한 currentUser fallback

```typescript
// 수정 전
export async function fetchWithAuth(
  route: string,
  userOrOptions?: User | null | RequestInit,
  maybeOptions?: RequestInit,
): Promise<Response> {
  const hasExplicitUserArg = arguments.length >= 3 || userOrOptions === null;
  // ...
  const user = explicitUser ?? getFirebaseAuth().currentUser; // fallback
}
```

**문제점**:
- `arguments.length` 기반 오버로드 분기 — TypeScript 트랜스파일레이션(특히 SWC/Turbopack)에서 깨질 수 있음
- `getFirebaseAuth().currentUser` fallback은 React 렌더링 사이클과 Firebase 내부 상태 간 race condition 유발
- 컴포넌트가 `useAuth()`의 `user`를 사용하지만 `fetchWithAuth`는 별도로 `currentUser`를 읽어 동기화 불일치 가능

---

## 수정 내용

### 1. AuthProvider.tsx — login() 즉시 setUser 호출

```typescript
// 수정 후
const login = useCallback(async (email, password) => {
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  // signInWithEmailAndPassword 성공 시점에 currentUser가 이미 갱신됨
  // onAuthStateChanged를 기다리지 않고 즉시 React 상태 반영
  setUser(getFirebaseAuth().currentUser);
}, []);
```

### 2. api-client.ts — fetchWithAuth 단순화

```typescript
// 수정 후: 오버로드 제거, 명시적 user 인자 필수화
export async function fetchWithAuth(
  route: string,
  user: User | null,       // 반드시 명시적 전달
  options?: RequestInit,
): Promise<Response> {
  const url = route.startsWith("http") ? route : buildApiUrl(route);
  const headers = new Headers(options?.headers);

  if (user) {
    const token = await user.getIdToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}
```

**변경 사항**:
- `getFirebaseAuth()` import 및 fallback 제거
- `arguments.length` 기반 오버로드 분기 제거
- 단일 시그니처로 통일 — 모든 호출처가 `useAuth()`의 `user`를 명시적으로 전달

### 3. api-client.auth.test.ts — 테스트 업데이트

- `vi.mock("./firebase")` 및 `firebaseMocks` 제거 (fallback 제거에 따라 불필요)
- 각 테스트에서 명시적으로 `user` 객체 또는 `null` 전달

---

## 변경 파일 목록

| 파일 | 변경 유형 |
|---|---|
| `apps/web/src/auth/AuthProvider.tsx` | 수정 — login()에 setUser 즉시 호출 추가 |
| `apps/web/src/lib/api-client.ts` | 수정 — fetchWithAuth 단순화, fallback 제거 |
| `apps/web/src/lib/api-client.auth.test.ts` | 수정 — 새 시그니처에 맞게 테스트 변경 |

---

## 검증

- `pnpm --filter web build` — TypeScript 컴파일 및 Next.js 빌드 성공
- `rtk vitest` — 58개 테스트 전부 통과 (실패 0)
- 기존 호출처 6개 파일(`DropzoneUploader`, `history/page`, `board/page`, `board/write/page`, `board/[id]/page`, `board/[id]/edit/page`)은 모두 이미 `user`를 명시적으로 전달하고 있어 수정 불필요

---

## 주의사항

- `signup()` 함수는 동일한 패턴이 아니므로 별도 수정 불필요 (회원가입 후 로그인 페이지로 이동하므로 race condition 발생 안 함)
- `logout()`은 `signOut()` 후 `setUser(null)`을 `onAuthStateChanged`에 위임 — logout 후에는 API 호출을 하지 않으므로 문제 없음
- `onAuthStateChanged` 리스너는 여전히 활성 상태 — 탭 간 동기화, 토큰 갱신 등에 필요
