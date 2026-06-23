# Task 8: Members-only board API and permission matrix

## Summary

Implemented board routes, persistence layer, and full permission matrix tests in `apps/api`.

## Files created/modified

- `apps/api/src/services/board-store.ts` (new) — MemoryBoardStore + FirestoreBoardStore with createPost, getPostById, listPosts, updatePost, deletePost
- `apps/api/src/routes/v1.board.ts` (new) — Board router with GET/POST/PATCH/DELETE endpoints
- `apps/api/src/routes/v1.ts` (modified) — Wired boardRouter via `router.use(boardRouter)`
- `apps/api/src/routes/v1.board.test.ts` (new) — 46 tests covering full permission matrix

## Permission matrix implemented

| Action | Anonymous | Normal member | boardModerator | Admin |
|--------|-----------|---------------|----------------|-------|
| GET /v1/board/posts | 401 | 200 | 200 | 200 |
| GET /v1/board/posts/:postId | 401 | 200 | 200 | 200 |
| POST general/qna | 401 | 201 | 201 | 201 |
| POST notice | 401 | 403 | 403 | 201 |
| PATCH own general/qna | 401 | 200 | 200 | 200 |
| PATCH other's general/qna | 401 | 403 | 200 | 200 |
| PATCH notice | 401 | 403 | 403 | 200 |
| PATCH category→notice | 401 | 403 | 403 | 200 |
| DELETE own general/qna | 401 | 204 | 204 | 204 |
| DELETE other's general/qna | 401 | 403 | 204 | 204 |
| DELETE notice | 401 | 403 | 403 | 204 |

## Key design decisions

- **authorId/authorName server-derived**: `authorId = req.user.uid`, `authorName = req.user.name || req.user.email || "Member"`. Client-provided author fields are silently ignored.
- **Notice posts admin-only**: Only admin can create, edit, or delete notice posts. Moderators cannot touch notice posts.
- **Moderator scope**: boardModerator can edit/delete general/qna posts by any user (moderation), but cannot create notice or change category to notice.
- **Member-only read**: All board endpoints require `requireAuth` — board is member-only as specified.
- **Validation**: title 1-120 chars, body 1-10000 chars, category allowlist (general/qna/notice), pageSize max 100.
- **Rate limiting**: Reuses the existing global IP-based rate limiter from app.ts. Board routes are not skipped.
- **Store plain text only**: No HTML rendering or `dangerouslySetInnerHTML` involved.

## Verification

### Command: `pnpm --filter api test`

```
Test Files  10 passed (10)
     Tests  224 passed (224)
  Duration  2.51s
```

Board test file: `src/routes/v1.board.test.ts` — 46 tests, all passed.

### Command: `pnpm --filter api typecheck`

```
> tsc --noEmit
(exit 0, no errors)
```

## Test coverage

- Anonymous access denied for all 5 board endpoints (5 tests)
- Invalid token rejected (1 test)
- Normal member create general/qna (2 tests)
- Normal member cannot create notice (1 test)
- Author spoof input ignored (1 test)
- authorName derivation from email fallback (1 test)
- Validation: empty title, empty body, invalid category, title>120, body>10000, missing category (6 tests)
- Owner edit/delete own general/qna (3 tests)
- Non-owner cannot edit/delete (2 tests)
- Admin: create notice, edit any, delete any, category→notice, edit notice, delete notice (6 tests)
- Moderator: cannot create notice, can edit general, can delete general, cannot category→notice, cannot edit notice, cannot delete notice (6 tests)
- Owner cannot escalate to notice (1 test)
- List pagination, filtering, invalid category/pageSize/page (5 tests)
- Post detail, 404 for non-existent (2 tests)
- Patch/delete 404 for non-existent (2 tests)
- Partial update validation (2 tests)

## No shared package modifications

No changes to `packages/shared` were needed. All required types were already exported from Todo 1.