# Session: Board API and permission matrix (Todo 8)

**Date:** 2026-06-22 19:21
**Task:** Todo 8 of `.omo/plans/auth-history-delete-board-final.md` — Members-only board API and permission matrix

## Changed files

- `apps/api/src/services/board-store.ts` (new) — Board persistence layer with MemoryBoardStore and FirestoreBoardStore
- `apps/api/src/routes/v1.board.ts` (new) — Board router with 5 endpoints (GET list, GET detail, POST create, PATCH update, DELETE)
- `apps/api/src/routes/v1.ts` (modified) — Imported and mounted boardRouter
- `apps/api/src/routes/v1.board.test.ts` (new) — 46 tests covering full permission matrix

## What changed

Implemented the members-only board API with server-derived author identity and custom-claims-based permission enforcement.

### Board store (`board-store.ts`)
- `MemoryBoardStore`: in-memory `Map<string, BoardPostRecord>` with auto-incrementing IDs
- `FirestoreBoardStore`: Firestore `boardPosts` collection with auto-generated doc IDs
- Both implement: `createPost`, `getPostById`, `listPosts` (with category filter + pagination), `updatePost`, `deletePost`
- Permission logic in store: owner/admin/moderator can edit/delete general/qna; only admin can edit/delete notice; category change to notice requires admin
- `resetForTesting()` method on MemoryBoardStore for test isolation

### Board routes (`v1.board.ts`)
- `GET /v1/board/posts` — member-only list with category filter and pagination (page/pageSize)
- `GET /v1/board/posts/:postId` — member-only detail
- `POST /v1/board/posts` — member-only create; rejects notice unless admin; authorId/authorName from token
- `PATCH /v1/board/posts/:postId` — owner/admin/moderator edit; category→notice requires admin
- `DELETE /v1/board/posts/:postId` — owner/admin/moderator delete; notice delete requires admin
- All endpoints use `requireAuth` (member-only)
- Validation: title 1-120 chars, body 1-10000 chars, category allowlist, pageSize max 100

### Permission matrix
- Anonymous: all endpoints 401
- Normal member: read all, create general/qna, edit/delete own general/qna
- boardModerator: read all, create general/qna, edit/delete any general/qna (moderation), cannot touch notice
- Admin: full access including notice create/edit/delete and category→notice

## Key decisions

- **Member-only read**: All board endpoints require authentication, consistent with "members-only board" in the plan.
- **authorName fallback**: `req.user.name || req.user.email || "Member"` — never from client input.
- **Notice is admin-only for all operations**: create, edit, delete, and category change to notice all require admin claim. Moderators cannot touch notice posts.
- **Rate limiting**: Reuses the existing global IP-based rate limiter from `app.ts`. No per-user board-specific rate limit was added since the global limiter already covers board routes.
- **Store plain text only**: No HTML rendering, no `dangerouslySetInnerHTML`.

## Verification

- `pnpm --filter api test`: 224/224 tests passed (10 test files, including 46 new board tests)
- `pnpm --filter api typecheck`: exit 0, no errors

## Not verified

- Firestore board store was not tested against a real Firestore instance (only MemoryBoardStore is exercised in tests, consistent with existing job-store test patterns).
- No web code was modified (per task constraints).

## Evidence

See `.omo/evidence/task-8-auth-history-delete-board-final.md` for detailed test output and permission matrix.