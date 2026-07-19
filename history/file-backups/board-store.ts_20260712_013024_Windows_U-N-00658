import { Firestore } from "@google-cloud/firestore";
import {
  BOARD_CATEGORIES,
  BOARD_DEFAULT_PAGE_SIZE,
  BOARD_MAX_PAGE_SIZE,
  type BoardCategory,
  type BoardCreatePostRequest,
  type BoardListResponse,
  type BoardPost,
  type BoardPostSummary,
  type BoardUpdatePostRequest,
} from "@hwp2pdf/shared";
import { config } from "../config.js";

// ---------------------------------------------------------------------------
// BoardPostRecord — internal storage shape (same as BoardPost plus id).
// ---------------------------------------------------------------------------

export type BoardPostRecord = BoardPost;

// ---------------------------------------------------------------------------
// Validation helpers (server-side, complement shared validators)
// ---------------------------------------------------------------------------

const TITLE_MAX_LENGTH = 120;
const BODY_MAX_LENGTH = 10_000;

export interface BoardPostInput {
  title: string;
  body: string;
  category: BoardCategory;
}

/** Validate title/body/category with length constraints. Returns error string or null. */
export function validateBoardPostInput(input: {
  title?: string;
  body?: string;
  category?: string;
}): string | null {
  const { title, body, category } = input;

  if (!title || title.trim().length === 0) {
    return "게시판 제목을 입력하세요.";
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return `게시판 제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`;
  }

  if (!body || body.trim().length === 0) {
    return "게시판 내용을 입력하세요.";
  }
  if (body.length > BODY_MAX_LENGTH) {
    return `게시판 내용은 ${BODY_MAX_LENGTH}자 이하여야 합니다.`;
  }

  if (!category || !BOARD_CATEGORIES.includes(category as BoardCategory)) {
    return "게시판 카테고리는 general, qna, notice 중 하나여야 합니다.";
  }

  return null;
}

// ---------------------------------------------------------------------------
// BoardStore interface
// ---------------------------------------------------------------------------

interface BoardStore {
  createPost(input: BoardPostInput, authorId: string, authorName: string): Promise<BoardPostRecord>;
  getPostById(id: string): Promise<BoardPostRecord | null>;
  listPosts(category?: BoardCategory, page?: number, pageSize?: number): Promise<BoardListResponse>;
  updatePost(
    id: string,
    input: BoardUpdatePostRequest,
    authorId: string,
    isAdmin: boolean,
    isModerator: boolean,
  ): Promise<BoardPostRecord | null>;
  deletePost(
    id: string,
    authorId: string,
    isAdmin: boolean,
    isModerator: boolean,
  ): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSummary(post: BoardPostRecord): BoardPostSummary {
  return {
    id: post.id,
    title: post.title,
    category: post.category,
    authorId: post.authorId,
    authorName: post.authorName,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function clampPageSize(size: number): number {
  if (size < 1) return BOARD_DEFAULT_PAGE_SIZE;
  if (size > BOARD_MAX_PAGE_SIZE) return BOARD_MAX_PAGE_SIZE;
  return size;
}

// ---------------------------------------------------------------------------
// MemoryBoardStore
// ---------------------------------------------------------------------------

export class MemoryBoardStore implements BoardStore {
  private readonly posts = new Map<string, BoardPostRecord>();
  private counter = 0;

  async createPost(input: BoardPostInput, authorId: string, authorName: string): Promise<BoardPostRecord> {
    const now = new Date().toISOString();
    const id = `post-${++this.counter}`;
    const post: BoardPostRecord = {
      id,
      title: input.title,
      body: input.body,
      category: input.category,
      authorId,
      authorName,
      createdAt: now,
      updatedAt: now,
    };
    this.posts.set(id, post);
    return post;
  }

  async getPostById(id: string): Promise<BoardPostRecord | null> {
    return this.posts.get(id) ?? null;
  }

  async listPosts(category?: BoardCategory, page?: number, pageSize?: number): Promise<BoardListResponse> {
    const p = Math.max(1, page ?? 1);
    const size = clampPageSize(pageSize ?? BOARD_DEFAULT_PAGE_SIZE);

    let posts = Array.from(this.posts.values());

    if (category) {
      posts = posts.filter((post) => post.category === category);
    }

    // Sort by createdAt descending (newest first).
    posts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    const total = posts.length;
    const totalPages = Math.max(1, Math.ceil(total / size));
    const start = (p - 1) * size;
    const end = start + size;
    const pageItems = posts.slice(start, end);

    return {
      data: pageItems.map(toSummary),
      meta: {
        total,
        page: p,
        pageSize: size,
        totalPages,
      },
    };
  }

  async updatePost(
    id: string,
    input: BoardUpdatePostRequest,
    authorId: string,
    isAdmin: boolean,
    isModerator: boolean,
  ): Promise<BoardPostRecord | null> {
    const current = this.posts.get(id);
    if (!current) return null;

    // Permission: owner, admin, or moderator can edit.
    const isOwner = current.authorId === authorId;
    if (!isOwner && !isAdmin && !isModerator) return null;

    // Notice posts can only be edited by admin (not owner, not moderator).
    if (current.category === "notice" && !isAdmin) {
      return null;
    }

    // Category change to notice requires admin.
    if (input.category === "notice" && !isAdmin) {
      return null;
    }

    const updated: BoardPostRecord = {
      ...current,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      updatedAt: new Date().toISOString(),
    };

    this.posts.set(id, updated);
    return updated;
  }

  async deletePost(
    id: string,
    authorId: string,
    isAdmin: boolean,
    isModerator: boolean,
  ): Promise<boolean> {
    const current = this.posts.get(id);
    if (!current) return false;

    // Permission: owner, admin, or moderator can delete.
    const isOwner = current.authorId === authorId;
    if (!isOwner && !isAdmin && !isModerator) return false;

    // Notice posts can only be deleted by admin (not owner, not moderator).
    if (current.category === "notice" && !isAdmin) {
      return false;
    }

    this.posts.delete(id);
    return true;
  }

  /** Clear all posts. Intended for test isolation only. */
  resetForTesting(): void {
    this.posts.clear();
    this.counter = 0;
  }
}

// ---------------------------------------------------------------------------
// FirestoreBoardStore
// ---------------------------------------------------------------------------

class FirestoreBoardStore implements BoardStore {
  private readonly firestore = new Firestore({
    projectId: config.firestoreProjectId || undefined,
    databaseId: config.firestoreDatabaseId,
  });

  private readonly collection = this.firestore.collection(
    process.env.FIRESTORE_BOARD_POSTS_COLLECTION ?? "boardPosts",
  );

  async createPost(input: BoardPostInput, authorId: string, authorName: string): Promise<BoardPostRecord> {
    const now = new Date().toISOString();
    const ref = this.collection.doc();
    const id = ref.id;
    const post: BoardPostRecord = {
      id,
      title: input.title,
      body: input.body,
      category: input.category,
      authorId,
      authorName,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(post);
    return post;
  }

  async getPostById(id: string): Promise<BoardPostRecord | null> {
    const snapshot = await this.collection.doc(id).get();
    if (!snapshot.exists) return null;
    return snapshot.data() as BoardPostRecord;
  }

  async listPosts(category?: BoardCategory, page?: number, pageSize?: number): Promise<BoardListResponse> {
    const p = Math.max(1, page ?? 1);
    const size = clampPageSize(pageSize ?? BOARD_DEFAULT_PAGE_SIZE);

    let query: FirebaseFirestore.Query = this.collection;

    if (category) {
      query = query.where("category", "==", category);
    }

    query = query.orderBy("createdAt", "desc");

    // Get total count via a separate query (Firestore doesn't support count
    // with ordering efficiently in all SDK versions).
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    const totalPages = Math.max(1, Math.ceil(total / size));
    const offset = (p - 1) * size;

    // Use limit + offset for pagination.
    const snapshot = await query.limit(size).offset(offset).get();
    const posts = snapshot.docs.map((doc) => doc.data() as BoardPostRecord);

    return {
      data: posts.map(toSummary),
      meta: {
        total,
        page: p,
        pageSize: size,
        totalPages,
      },
    };
  }

  async updatePost(
    id: string,
    input: BoardUpdatePostRequest,
    authorId: string,
    isAdmin: boolean,
    isModerator: boolean,
  ): Promise<BoardPostRecord | null> {
    const ref = this.collection.doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;

    const current = snapshot.data() as BoardPostRecord;

    const isOwner = current.authorId === authorId;
    if (!isOwner && !isAdmin && !isModerator) return null;

    // Notice posts can only be edited by admin (not owner, not moderator).
    if (current.category === "notice" && !isAdmin) {
      return null;
    }

    if (input.category === "notice" && !isAdmin) {
      return null;
    }

    const updated: BoardPostRecord = {
      ...current,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      updatedAt: new Date().toISOString(),
    };

    await ref.set(updated);
    return updated;
  }

  async deletePost(
    id: string,
    authorId: string,
    isAdmin: boolean,
    isModerator: boolean,
  ): Promise<boolean> {
    const ref = this.collection.doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return false;

    const current = snapshot.data() as BoardPostRecord;

    const isOwner = current.authorId === authorId;
    if (!isOwner && !isAdmin && !isModerator) return false;

    // Notice posts can only be deleted by admin (not owner, not moderator).
    if (current.category === "notice" && !isAdmin) {
      return false;
    }

    await ref.delete();
    return true;
  }
}

// ---------------------------------------------------------------------------
// Store selection + exported functions
// ---------------------------------------------------------------------------

const selectedBoardStore: BoardStore =
  config.jobStoreBackend === "firestore" ? new FirestoreBoardStore() : new MemoryBoardStore();

export function createBoardPost(input: BoardPostInput, authorId: string, authorName: string) {
  return selectedBoardStore.createPost(input, authorId, authorName);
}

export function getBoardPostById(id: string) {
  return selectedBoardStore.getPostById(id);
}

export function listBoardPosts(category?: BoardCategory, page?: number, pageSize?: number) {
  return selectedBoardStore.listPosts(category, page, pageSize);
}

export function updateBoardPost(
  id: string,
  input: BoardUpdatePostRequest,
  authorId: string,
  isAdmin: boolean,
  isModerator: boolean,
) {
  return selectedBoardStore.updatePost(id, input, authorId, isAdmin, isModerator);
}

export function deleteBoardPost(
  id: string,
  authorId: string,
  isAdmin: boolean,
  isModerator: boolean,
) {
  return selectedBoardStore.deletePost(id, authorId, isAdmin, isModerator);
}

// Export the selected store instance for testing and advanced use.
export { selectedBoardStore as boardStore };