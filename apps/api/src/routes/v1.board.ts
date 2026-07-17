import { Router } from "express";
import {
  API_ROUTES,
  BOARD_CATEGORIES,
  BOARD_DEFAULT_PAGE_SIZE,
  BOARD_MAX_PAGE_SIZE,
  type BoardCategory,
  type BoardCreatePostRequest,
  type BoardListResponse,
  type BoardPost,
  type BoardUpdatePostRequest,
} from "@hwp2pdf/shared";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../utils/api-error.js";
import {
  createBoardPost,
  deleteBoardPost,
  getBoardPostById,
  listBoardPosts,
  updateBoardPost,
  validateBoardPostInput,
  validateBoardPostPatch,
} from "../services/board-store.js";

export const boardRouter = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a route param as a string. Express 5 types params as
 * `string | string[]`; in practice single-param routes always produce a string.
 */
function getParam(request: { params: Record<string, string | string[]> }, name: string): string {
  const value = request.params[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Derive the author display name from the authenticated user.
 * Never uses client-provided input for authorId or authorName.
 */
function deriveAuthorName(user: { uid: string; email?: string; name?: string }): string {
  return user.name || user.email || "Member";
}

/**
 * Parse and validate the category query parameter for list requests.
 * Returns the validated category or undefined (no filter).
 * Throws ApiError(422) if the category is invalid.
 */
function parseCategoryFilter(raw: unknown): BoardCategory | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string" || !BOARD_CATEGORIES.includes(raw as BoardCategory)) {
    throw new ApiError(422, "invalid_category", "게시판 카테고리는 general, qna, notice 중 하나여야 합니다.");
  }
  return raw as BoardCategory;
}

/**
 * Parse and validate page/pageSize query parameters.
 * Throws ApiError(422) on invalid values.
 */
function parsePagination(query: Record<string, unknown>): { page: number; pageSize: number } {
  let page = BOARD_DEFAULT_PAGE_SIZE > 0 ? 1 : 1;
  let pageSize = BOARD_DEFAULT_PAGE_SIZE;

  if (query.page !== undefined && query.page !== null && query.page !== "") {
    const parsed = Number(query.page);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new ApiError(422, "invalid_page", "페이지 번호는 1 이상의 정수여야 합니다.");
    }
    page = parsed;
  }

  if (query.pageSize !== undefined && query.pageSize !== null && query.pageSize !== "") {
    const parsed = Number(query.pageSize);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new ApiError(422, "invalid_page_size", "페이지 크기는 1 이상의 정수여야 합니다.");
    }
    if (parsed > BOARD_MAX_PAGE_SIZE) {
      throw new ApiError(422, "invalid_page_size", `페이지 크기는 최대 ${BOARD_MAX_PAGE_SIZE}개까지 가능합니다.`);
    }
    pageSize = parsed;
  }

  return { page, pageSize };
}

// ---------------------------------------------------------------------------
// GET /v1/board/posts — member-only list
// ---------------------------------------------------------------------------

boardRouter.get(
  API_ROUTES.BOARD_POSTS,
  requireAuth,
  async (request, response, next) => {
    try {
      const query = request.query as Record<string, unknown>;
      const category = parseCategoryFilter(query.category);
      const { page, pageSize } = parsePagination(query);

      const result: BoardListResponse = await listBoardPosts(category, page, pageSize);
      response.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /v1/board/posts/:postId — member-only detail
// ---------------------------------------------------------------------------

boardRouter.get(
  `${API_ROUTES.BOARD_POSTS}/:postId`,
  requireAuth,
  async (request, response, next) => {
    try {
      const postId = getParam(request, "postId");
      const post: BoardPost | null = await getBoardPostById(postId);
      if (!post) {
        next(new ApiError(404, "post_not_found", "게시글을 찾을 수 없습니다."));
        return;
      }
      response.json(post);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /v1/board/posts — member-only create
// ---------------------------------------------------------------------------

boardRouter.post(
  API_ROUTES.BOARD_POSTS,
  requireAuth,
  async (request, response, next) => {
    try {
      if (!request.user) {
        next(new ApiError(401, "unauthorized", "인증이 필요합니다."));
        return;
      }

      const body = request.body as Partial<BoardCreatePostRequest>;

      // Validate title/body/category with length constraints.
      const validationError = validateBoardPostInput({
        title: body.title,
        body: body.body,
        category: body.category,
      });
      if (validationError) {
        next(new ApiError(422, "invalid_post", validationError));
        return;
      }

      // Reject notice creation unless admin.
      if (body.category === "notice" && !request.user.admin) {
        next(new ApiError(403, "forbidden", "공지사항은 관리자만 작성할 수 있습니다."));
        return;
      }

      // Server derives authorId/authorName from token/profile — never from client.
      const authorId = request.user.uid;
      const authorName = deriveAuthorName(request.user);

      const post = await createBoardPost(
        {
          title: body.title!,
          body: body.body!,
          category: body.category! as BoardCategory,
        },
        authorId,
        authorName,
      );

      response.status(201).json(post);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /v1/board/posts/:postId — owner/admin/moderator edit
// ---------------------------------------------------------------------------

boardRouter.patch(
  `${API_ROUTES.BOARD_POSTS}/:postId`,
  requireAuth,
  async (request, response, next) => {
    try {
      if (!request.user) {
        next(new ApiError(401, "unauthorized", "인증이 필요합니다."));
        return;
      }

      const postId = getParam(request, "postId");
      const body = request.body as Partial<BoardUpdatePostRequest>;

      // Validate provided fields (partial update — only check present fields).
      if (body.title !== undefined || body.body !== undefined || body.category !== undefined) {
        const validationError = validateBoardPostPatch({
          title: body.title,
          body: body.body,
          category: body.category,
        });
        if (validationError) {
          next(new ApiError(422, "invalid_post", validationError));
          return;
        }
      }

      // Reject category change to notice unless admin.
      if (body.category === "notice" && !request.user.admin) {
        next(new ApiError(403, "forbidden", "공지사항 카테고리 변경은 관리자만 가능합니다."));
        return;
      }

      const updated = await updateBoardPost(
        postId,
        body,
        request.user.uid,
        request.user.admin,
        request.user.boardModerator,
      );

      if (!updated) {
        // Could be not found or not authorized — use 404 for not found,
        // 403 for permission denied. Check existence first.
        const existing = await getBoardPostById(postId);
        if (!existing) {
          next(new ApiError(404, "post_not_found", "게시글을 찾을 수 없습니다."));
          return;
        }
        next(new ApiError(403, "forbidden", "게시글 수정 권한이 없습니다."));
        return;
      }

      response.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /v1/board/posts/:postId — owner/admin/moderator delete
// ---------------------------------------------------------------------------

boardRouter.delete(
  `${API_ROUTES.BOARD_POSTS}/:postId`,
  requireAuth,
  async (request, response, next) => {
    try {
      if (!request.user) {
        next(new ApiError(401, "unauthorized", "인증이 필요합니다."));
        return;
      }

      const postId = getParam(request, "postId");

      const deleted = await deleteBoardPost(
        postId,
        request.user.uid,
        request.user.admin,
        request.user.boardModerator,
      );

      if (!deleted) {
        // Could be not found or not authorized — check existence first.
        const existing = await getBoardPostById(postId);
        if (!existing) {
          next(new ApiError(404, "post_not_found", "게시글을 찾을 수 없습니다."));
          return;
        }
        next(new ApiError(403, "forbidden", "게시글 삭제 권한이 없습니다."));
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);
