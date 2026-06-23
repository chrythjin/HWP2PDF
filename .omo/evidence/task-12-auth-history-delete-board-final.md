# Task 12: Web Board UI — Evidence

## Task
Implement Todo 12 of `.omo/plans/auth-history-delete-board-final.md`: Web board UI.

## Files Created
- `apps/web/src/hooks/useBoardClaims.ts` — hook to read Firebase custom claims (admin, boardModerator) via `getIdTokenResult(true)`
- `apps/web/src/app/board/page.tsx` — board list page with category filter, pagination, write button
- `apps/web/src/app/board/[id]/page.tsx` — board detail page with edit/delete controls
- `apps/web/src/app/board/write/page.tsx` — board write page with title/body/category form
- `apps/web/src/app/board/[id]/edit/page.tsx` — board edit page with pre-filled form
- `apps/web/src/app/board/board-page.test.tsx` — 27 tests covering all board UI pages

## Verification

### Test command
```
pnpm --filter web test
```

### Test results
```
Test Files  6 passed (6)
     Tests  58 passed (58)
  Duration  3.41s
```

Board-specific test file:
```
src/app/board/board-page.test.tsx (27 tests) 579ms
```

### Typecheck
```
pnpm --filter web typecheck
```
Result: clean exit, no errors.

## Test Coverage Summary

### BoardListPage (6 tests)
- ✓ shows login prompt when unauthenticated
- ✓ renders post list for authenticated member
- ✓ shows write button for authenticated users
- ✓ hides notice category filter for non-admin users
- ✓ shows notice category filter for admin users
- ✓ sends Authorization header in list fetch

### BoardWritePage (6 tests)
- ✓ shows login prompt when unauthenticated
- ✓ renders form with title, body, category for authenticated member
- ✓ hides notice option for non-admin members
- ✓ shows notice option for admin users
- ✓ does not have an author field in the form
- ✓ submits POST with title, body, category and Authorization (no authorId/authorName in body)

### BoardDetailPage (8 tests)
- ✓ shows login prompt when unauthenticated
- ✓ renders post detail for authenticated member
- ✓ shows edit/delete buttons for post owner
- ✓ hides edit/delete buttons for non-owner non-admin non-moderator
- ✓ shows edit/delete buttons for admin even if not owner
- ✓ shows edit/delete buttons for boardModerator even if not owner
- ✓ sends DELETE with Authorization after confirmation
- ✓ renders body as plain text (no dangerouslySetInnerHTML) — XSS payload is displayed as text

### BoardEditPage (7 tests)
- ✓ shows login prompt when unauthenticated
- ✓ pre-fills form with existing post data
- ✓ hides notice option for non-admin on edit form
- ✓ shows notice option for admin on edit form
- ✓ shows error for 403 (no edit permission)
- ✓ shows error for 404 (post not found)
- ✓ submits PATCH with Authorization on save (no authorId/authorName in body)

## Key Design Decisions

1. **useBoardClaims hook**: Reads Firebase custom claims via `user.getIdTokenResult(true)` with force refresh. UI gating is convenience only — the API enforces authority (plan D8).

2. **fetchWithAuth**: Uses the existing `@/lib/api-client` which reads `auth.currentUser` from the Firebase singleton and attaches `Authorization: Bearer <token>`.

3. **Notice category gating**: The notice option is hidden from non-admin users in both the write form category select and the list page category filter. The API independently rejects notice creation/edit by non-admin.

4. **No author field**: Forms never include authorId/authorName fields — the server derives these from the token. Tests verify these fields are absent from request bodies.

5. **Plain text body**: Post body is rendered in a `<pre>` element with `whitespace-pre-wrap` — no `dangerouslySetInnerHTML`. The XSS test confirms script tags are displayed as text, not executed.

6. **Edit/delete permission**: Controls are visible when `isOwner || admin || boardModerator`. The API independently enforces the permission matrix.

7. **403/404 handling**: Edit page gracefully handles 403 (no permission) and 404 (not found) with error messages and a link back to the list.

8. **vi.hoisted for mock state**: The test uses `vi.hoisted` to create mutable refs for `mockCurrentUser` and `authStateCallback` that survive vitest's `vi.mock` hoisting, ensuring the `@/lib/firebase` mock's `auth.currentUser` getter returns the correct test user.