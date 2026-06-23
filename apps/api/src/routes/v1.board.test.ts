import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createApp } from "../app.js";
import { setTokenVerifierForTesting } from "../middleware/auth.js";
import { boardStore } from "../services/board-store.js";
import { API_ROUTES } from "@hwp2pdf/shared";
import type { Express } from "express";
import type { Response } from "supertest";

// ---------------------------------------------------------------------------
// Tests for members-only board API and permission matrix (Todo 8).
//
// Verifies:
// - Anonymous read/write denied (member-only board)
// - Normal member can create general/qna posts
// - Normal member cannot create notice posts
// - Author spoof input (authorId/authorName in body) is ignored
// - Owner can edit/delete own general/qna post
// - Non-owner cannot edit/delete another's post
// - Admin can create/edit/delete notice posts and moderate any post
// - boardModerator can edit/delete any general/qna post (moderation)
// - boardModerator cannot create notice posts
// - Category change to notice requires admin
// - Validation: title/body/category/pageSize constraints
// - Pagination and category filtering work correctly
// ---------------------------------------------------------------------------

interface MockDecodedToken {
  uid: string;
  email?: string;
  name?: string;
  admin?: boolean;
  boardModerator?: boolean;
}

const mockTokens: Record<string, MockDecodedToken> = {
  "valid-user-token": {
    uid: "user-123",
    email: "user@example.com",
    name: "Test User",
  },
  "valid-other-user-token": {
    uid: "user-456",
    email: "other@example.com",
    name: "Other User",
  },
  "valid-admin-token": {
    uid: "admin-001",
    email: "admin@example.com",
    name: "Admin User",
    admin: true,
  },
  "valid-moderator-token": {
    uid: "mod-001",
    email: "mod@example.com",
    name: "Mod User",
    boardModerator: true,
  },
  "valid-user-no-name-token": {
    uid: "user-789",
    email: "noname@example.com",
  },
};

function createMockVerifier(tokens: Record<string, MockDecodedToken>) {
  return async (idToken: string): Promise<MockDecodedToken> => {
    const decoded = tokens[idToken];
    if (!decoded) {
      const err = new Error("Firebase ID token has invalid signature");
      (err as Error & { code?: string }).code = "auth/invalid-id-token";
      throw err;
    }
    return decoded;
  };
}

// Mock the conversion service to avoid spawning LibreOffice.
vi.mock("../services/conversion-service.js", () => ({
  convertJobToPdf: vi.fn().mockResolvedValue(undefined),
}));

// Mock storage-service GCS functions to avoid real GCS calls.
vi.mock("../services/storage-service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/storage-service.js")>();
  return {
    ...actual,
    shouldUseGcs: vi.fn(() => false),
    persistOriginalFile: vi.fn(async () => undefined),
    downloadOriginalFile: vi.fn(async () => undefined),
    createOriginalUploadUrl: vi.fn(async () => null),
    getProtectedDownloadUrl: vi.fn(async () => undefined),
  };
});

describe("members-only board API and permission matrix (Todo 8)", () => {
  let app: Express;
  let tempUploadDir: string;
  let tempResultDir: string;

  beforeEach(async () => {
    setTokenVerifierForTesting(createMockVerifier(mockTokens));

    // Reset the board store to isolate tests from each other.
    if (boardStore instanceof Object && "resetForTesting" in boardStore) {
      (boardStore as { resetForTesting: () => void }).resetForTesting();
    }

    tempUploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "hwp2pdf-board-upload-"));
    tempResultDir = await fs.mkdtemp(path.join(os.tmpdir(), "hwp2pdf-board-result-"));

    process.env.UPLOAD_DIR = tempUploadDir;
    process.env.RESULT_DIR = tempResultDir;

    app = await createApp();
  });

  afterEach(async () => {
    setTokenVerifierForTesting(null);
    delete process.env.UPLOAD_DIR;
    delete process.env.RESULT_DIR;
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Helper: create a post as a given user
  // -----------------------------------------------------------------------

  async function createPostAs(
    token: string,
    payload: { title: string; body: string; category: string },
  ): Promise<Response> {
    return await request(app)
      .post(API_ROUTES.BOARD_POSTS)
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
  }

  // -----------------------------------------------------------------------
  // Anonymous access denied (member-only board)
  // -----------------------------------------------------------------------

  describe("anonymous access denied", () => {
    it("GET /v1/board/posts without auth returns 401", async () => {
      const res = await request(app).get(API_ROUTES.BOARD_POSTS);
      expect(res.status).toBe(401);
    });

    it("GET /v1/board/posts/:postId without auth returns 401", async () => {
      const res = await request(app).get(`${API_ROUTES.BOARD_POSTS}/post-1`);
      expect(res.status).toBe(401);
    });

    it("POST /v1/board/posts without auth returns 401", async () => {
      const res = await request(app)
        .post(API_ROUTES.BOARD_POSTS)
        .send({ title: "Test", body: "Body", category: "general" });
      expect(res.status).toBe(401);
    });

    it("PATCH /v1/board/posts/:postId without auth returns 401", async () => {
      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/post-1`)
        .send({ title: "Updated" });
      expect(res.status).toBe(401);
    });

    it("DELETE /v1/board/posts/:postId without auth returns 401", async () => {
      const res = await request(app).delete(`${API_ROUTES.BOARD_POSTS}/post-1`);
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // Invalid token rejected
  // -----------------------------------------------------------------------

  describe("invalid token rejected", () => {
    it("GET /v1/board/posts with invalid token returns 401", async () => {
      const res = await request(app)
        .get(API_ROUTES.BOARD_POSTS)
        .set("Authorization", "Bearer invalid-token");
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // Normal member can create general/qna
  // -----------------------------------------------------------------------

  describe("normal member create general/qna", () => {
    it("creates a general post and returns 201", async () => {
      const res = await createPostAs("valid-user-token", {
        title: "General Post",
        body: "This is a general post body.",
        category: "general",
      });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe("General Post");
      expect(res.body.category).toBe("general");
      expect(res.body.authorId).toBe("user-123");
      expect(res.body.authorName).toBe("Test User");
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
    });

    it("creates a qna post and returns 201", async () => {
      const res = await createPostAs("valid-user-token", {
        title: "QNA Post",
        body: "I have a question.",
        category: "qna",
      });

      expect(res.status).toBe(201);
      expect(res.body.category).toBe("qna");
    });
  });

  // -----------------------------------------------------------------------
  // Normal member cannot create notice
  // -----------------------------------------------------------------------

  describe("normal member cannot create notice", () => {
    it("returns 403 when creating notice post", async () => {
      const res = await createPostAs("valid-user-token", {
        title: "Notice Post",
        body: "This is a notice.",
        category: "notice",
      });

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // Author spoof input ignored
  // -----------------------------------------------------------------------

  describe("author spoof input ignored", () => {
    it("ignores client-provided authorId and authorName", async () => {
      const res = await createPostAs("valid-user-token", {
        title: "Spoof Test",
        body: "Trying to spoof author.",
        category: "general",
      });

      // Also try sending author fields — they should be ignored.
      const res2 = await request(app)
        .post(API_ROUTES.BOARD_POSTS)
        .set("Authorization", "Bearer valid-user-token")
        .send({
          title: "Spoof Test 2",
          body: "Trying to spoof author again.",
          category: "general",
          authorId: "fake-admin-id",
          authorName: "Fake Admin",
        });

      expect(res.status).toBe(201);
      expect(res.body.authorId).toBe("user-123");
      expect(res.body.authorName).toBe("Test User");

      expect(res2.status).toBe(201);
      expect(res2.body.authorId).toBe("user-123");
      expect(res2.body.authorName).toBe("Test User");
    });
  });

  // -----------------------------------------------------------------------
  // authorName derivation from email when name is absent
  // -----------------------------------------------------------------------

  describe("authorName derivation", () => {
    it("falls back to email when name is absent", async () => {
      const res = await createPostAs("valid-user-no-name-token", {
        title: "No Name User",
        body: "My token has no name claim.",
        category: "general",
      });

      expect(res.status).toBe(201);
      expect(res.body.authorName).toBe("noname@example.com");
    });
  });

  // -----------------------------------------------------------------------
  // Validation: title/body/category constraints
  // -----------------------------------------------------------------------

  describe("validation", () => {
    it("rejects empty title", async () => {
      const res = await createPostAs("valid-user-token", {
        title: "",
        body: "Body content",
        category: "general",
      });
      expect(res.status).toBe(422);
    });

    it("rejects empty body", async () => {
      const res = await createPostAs("valid-user-token", {
        title: "Title",
        body: "",
        category: "general",
      });
      expect(res.status).toBe(422);
    });

    it("rejects invalid category", async () => {
      const res = await createPostAs("valid-user-token", {
        title: "Title",
        body: "Body",
        category: "invalid",
      });
      expect(res.status).toBe(422);
    });

    it("rejects title exceeding 120 chars", async () => {
      const res = await createPostAs("valid-user-token", {
        title: "a".repeat(121),
        body: "Body",
        category: "general",
      });
      expect(res.status).toBe(422);
    });

    it("rejects body exceeding 10000 chars", async () => {
      const res = await createPostAs("valid-user-token", {
        title: "Title",
        body: "a".repeat(10001),
        category: "general",
      });
      expect(res.status).toBe(422);
    });

    it("rejects missing category", async () => {
      const res = await request(app)
        .post(API_ROUTES.BOARD_POSTS)
        .set("Authorization", "Bearer valid-user-token")
        .send({ title: "Title", body: "Body" });
      expect(res.status).toBe(422);
    });
  });

  // -----------------------------------------------------------------------
  // Owner can edit/delete own general/qna post
  // -----------------------------------------------------------------------

  describe("owner edit/delete own post", () => {
    it("owner can edit own general post", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "Original Title",
        body: "Original body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-user-token")
        .send({ title: "Updated Title" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Title");
      expect(res.body.body).toBe("Original body");
    });

    it("owner can delete own general post", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "To Delete",
        body: "Will be deleted",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .delete(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-user-token");

      expect(res.status).toBe(204);

      // Verify it's gone
      const getRes = await request(app)
        .get(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-user-token");
      expect(getRes.status).toBe(404);
    });

    it("owner can change category of own post between general and qna", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "Category Change",
        body: "Body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-user-token")
        .send({ category: "qna" });

      expect(res.status).toBe(200);
      expect(res.body.category).toBe("qna");
    });
  });

  // -----------------------------------------------------------------------
  // Non-owner cannot edit/delete another's post
  // -----------------------------------------------------------------------

  describe("non-owner cannot edit/delete", () => {
    it("non-owner cannot edit another user's post", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "User A Post",
        body: "Body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-other-user-token")
        .send({ title: "Hacked Title" });

      expect(res.status).toBe(403);
    });

    it("non-owner cannot delete another user's post", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "User A Post",
        body: "Body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .delete(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-other-user-token");

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // Admin can create/edit/delete notice and moderate any post
  // -----------------------------------------------------------------------

  describe("admin permissions", () => {
    it("admin can create notice post", async () => {
      const res = await createPostAs("valid-admin-token", {
        title: "Official Notice",
        body: "This is an official notice.",
        category: "notice",
      });

      expect(res.status).toBe(201);
      expect(res.body.category).toBe("notice");
      expect(res.body.authorId).toBe("admin-001");
    });

    it("admin can edit any user's general post", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "User Post",
        body: "Body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-admin-token")
        .send({ title: "Admin Edited" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Admin Edited");
    });

    it("admin can delete any user's general post", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "User Post",
        body: "Body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .delete(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-admin-token");

      expect(res.status).toBe(204);
    });

    it("admin can change a post category to notice", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "General Post",
        body: "Body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-admin-token")
        .send({ category: "notice" });

      expect(res.status).toBe(200);
      expect(res.body.category).toBe("notice");
    });

    it("admin can edit notice post", async () => {
      const createRes = await createPostAs("valid-admin-token", {
        title: "Notice",
        body: "Notice body",
        category: "notice",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-admin-token")
        .send({ title: "Updated Notice" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Notice");
    });

    it("admin can delete notice post", async () => {
      const createRes = await createPostAs("valid-admin-token", {
        title: "Notice to Delete",
        body: "Body",
        category: "notice",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .delete(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-admin-token");

      expect(res.status).toBe(204);
    });
  });

  // -----------------------------------------------------------------------
  // boardModerator can moderate (edit/delete) general/qna but not notice
  // -----------------------------------------------------------------------

  describe("boardModerator permissions", () => {
    it("boardModerator cannot create notice post", async () => {
      const res = await createPostAs("valid-moderator-token", {
        title: "Mod Notice Attempt",
        body: "Body",
        category: "notice",
      });

      expect(res.status).toBe(403);
    });

    it("boardModerator can edit another user's general post", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "User Post",
        body: "Body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-moderator-token")
        .send({ title: "Mod Edited" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Mod Edited");
    });

    it("boardModerator can delete another user's general post", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "User Post",
        body: "Body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .delete(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-moderator-token");

      expect(res.status).toBe(204);
    });

    it("boardModerator cannot change category to notice", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "General Post",
        body: "Body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-moderator-token")
        .send({ category: "notice" });

      expect(res.status).toBe(403);
    });

    it("boardModerator cannot edit notice post", async () => {
      // Admin creates a notice
      const createRes = await createPostAs("valid-admin-token", {
        title: "Admin Notice",
        body: "Notice body",
        category: "notice",
      });
      const postId = createRes.body.id;

      // Moderator tries to edit
      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-moderator-token")
        .send({ title: "Mod Edited Notice" });

      expect(res.status).toBe(403);
    });

    it("boardModerator cannot delete notice post", async () => {
      const createRes = await createPostAs("valid-admin-token", {
        title: "Admin Notice",
        body: "Notice body",
        category: "notice",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .delete(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-moderator-token");

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // Owner cannot change own post to notice
  // -----------------------------------------------------------------------

  describe("owner cannot escalate to notice", () => {
    it("owner cannot change own general post to notice", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "My Post",
        body: "Body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-user-token")
        .send({ category: "notice" });

      expect(res.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------------
  // GET /v1/board/posts — list with pagination and filtering
  // -----------------------------------------------------------------------

  describe("list with pagination and filtering", () => {
    it("returns paginated list of posts", async () => {
      // Create a few posts
      for (let i = 0; i < 3; i++) {
        await createPostAs("valid-user-token", {
          title: `Post ${i}`,
          body: `Body ${i}`,
          category: "general",
        });
      }

      const res = await request(app)
        .get(API_ROUTES.BOARD_POSTS)
        .set("Authorization", "Bearer valid-user-token")
        .query({ page: 1, pageSize: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(3);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.pageSize).toBe(2);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it("filters by category", async () => {
      await createPostAs("valid-user-token", {
        title: "General 1",
        body: "Body",
        category: "general",
      });
      await createPostAs("valid-user-token", {
        title: "QNA 1",
        body: "Body",
        category: "qna",
      });

      const res = await request(app)
        .get(API_ROUTES.BOARD_POSTS)
        .set("Authorization", "Bearer valid-user-token")
        .query({ category: "qna" });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category).toBe("qna");
    });

    it("rejects invalid category filter", async () => {
      const res = await request(app)
        .get(API_ROUTES.BOARD_POSTS)
        .set("Authorization", "Bearer valid-user-token")
        .query({ category: "invalid" });

      expect(res.status).toBe(422);
    });

    it("rejects pageSize exceeding max", async () => {
      const res = await request(app)
        .get(API_ROUTES.BOARD_POSTS)
        .set("Authorization", "Bearer valid-user-token")
        .query({ pageSize: 101 });

      expect(res.status).toBe(422);
    });

    it("rejects invalid page", async () => {
      const res = await request(app)
        .get(API_ROUTES.BOARD_POSTS)
        .set("Authorization", "Bearer valid-user-token")
        .query({ page: 0 });

      expect(res.status).toBe(422);
    });
  });

  // -----------------------------------------------------------------------
  // GET /v1/board/posts/:postId — detail
  // -----------------------------------------------------------------------

  describe("get post detail", () => {
    it("returns post detail for member", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "Detail Test",
        body: "Full body content",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .get(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-other-user-token");

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(postId);
      expect(res.body.title).toBe("Detail Test");
      expect(res.body.body).toBe("Full body content");
    });

    it("returns 404 for non-existent post", async () => {
      const res = await request(app)
        .get(`${API_ROUTES.BOARD_POSTS}/nonexistent-post-id`)
        .set("Authorization", "Bearer valid-user-token");

      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // PATCH /v1/board/posts/:postId — not found
  // -----------------------------------------------------------------------

  describe("patch non-existent post", () => {
    it("returns 404", async () => {
      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/nonexistent-post-id`)
        .set("Authorization", "Bearer valid-user-token")
        .send({ title: "Updated" });

      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /v1/board/posts/:postId — not found
  // -----------------------------------------------------------------------

  describe("delete non-existent post", () => {
    it("returns 404", async () => {
      const res = await request(app)
        .delete(`${API_ROUTES.BOARD_POSTS}/nonexistent-post-id`)
        .set("Authorization", "Bearer valid-user-token");

      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // Partial update validation
  // -----------------------------------------------------------------------

  describe("partial update validation", () => {
    it("allows updating only title", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "Original",
        body: "Body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-user-token")
        .send({ title: "New Title Only" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("New Title Only");
      expect(res.body.body).toBe("Body");
    });

    it("rejects title exceeding 120 chars on update", async () => {
      const createRes = await createPostAs("valid-user-token", {
        title: "Original",
        body: "Body",
        category: "general",
      });
      const postId = createRes.body.id;

      const res = await request(app)
        .patch(`${API_ROUTES.BOARD_POSTS}/${postId}`)
        .set("Authorization", "Bearer valid-user-token")
        .send({ title: "a".repeat(121) });

      expect(res.status).toBe(422);
    });
  });
});