import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardCategory, BoardPost } from "@hwp2pdf/shared";
import { readFile } from "node:fs/promises";
import path from "node:path";

const firestoreState = vi.hoisted(() => ({
  collectionName: "",
  operations: [] as Array<readonly unknown[]>,
  posts: [] as BoardPost[],
}));

vi.mock("@google-cloud/firestore", () => {
  class Firestore {
    collection(name: string) {
      firestoreState.collectionName = name;

      let category: BoardCategory | undefined;
      let limit = Number.POSITIVE_INFINITY;
      let offset = 0;

      const filteredPosts = () => {
        const posts = category
          ? firestoreState.posts.filter((post) => post.category === category)
          : firestoreState.posts;
        return [...posts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      };

      const query = {
        where(fieldPath: string, operator: string, value: BoardCategory) {
          firestoreState.operations.push(["where", fieldPath, operator, value]);
          category = value;
          return query;
        },
        orderBy(fieldPath: string, direction: string) {
          firestoreState.operations.push(["orderBy", fieldPath, direction]);
          return query;
        },
        count() {
          firestoreState.operations.push(["count"]);
          return {
            get: async () => {
              firestoreState.operations.push(["count.get"]);
              return { data: () => ({ count: filteredPosts().length }) };
            },
          };
        },
        limit(value: number) {
          firestoreState.operations.push(["limit", value]);
          limit = value;
          return query;
        },
        offset(value: number) {
          firestoreState.operations.push(["offset", value]);
          offset = value;
          return query;
        },
        async get() {
          firestoreState.operations.push(["get"]);
          return {
            docs: filteredPosts()
              .slice(offset, offset + limit)
              .map((post) => ({ data: () => post })),
          };
        },
      };

      return query;
    }
  }

  return { Firestore };
});

const categories: readonly BoardCategory[] = ["general", "qna", "notice"];

function post(id: string, category: BoardCategory, createdAt: string): BoardPost {
  return {
    id,
    title: id,
    body: `${id} body`,
    category,
    authorId: "author-1",
    authorName: "Author",
    createdAt,
    updatedAt: createdAt,
  };
}

async function seedMemoryStore() {
  const { MemoryBoardStore } = await import("./board-store.js");
  const store = new MemoryBoardStore();
  const idsByCategory = new Map<BoardCategory, string[]>();

  for (const category of categories) {
    idsByCategory.set(category, []);
  }

  let minute = 0;
  for (const category of [...categories, ...categories]) {
    vi.setSystemTime(new Date(Date.UTC(2026, 0, 1, 0, minute++)));
    const created = await store.createPost(
      { title: `${category}-${minute}`, body: "body", category },
      "author-1",
      "Author",
    );
    idsByCategory.get(category)?.push(created.id);
  }

  return { idsByCategory, store };
}

describe("board store list ordering and pagination", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    firestoreState.collectionName = "";
    firestoreState.operations = [];
    firestoreState.posts = [];
    delete process.env.FIRESTORE_BOARD_POSTS_COLLECTION;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.JOB_STORE_BACKEND;
    delete process.env.FIRESTORE_BOARD_POSTS_COLLECTION;
  });

  it("keeps Memory category and unfiltered pages in descending createdAt order", async () => {
    const { idsByCategory, store } = await seedMemoryStore();

    for (const category of categories) {
      const firstPage = await store.listPosts(category, 1, 1);
      const secondPage = await store.listPosts(category, 2, 1);
      const expected = [...(idsByCategory.get(category) ?? [])].reverse();

      expect([...firstPage.data, ...secondPage.data].map(({ id }) => id)).toEqual(expected);
      expect(firstPage.meta).toEqual({ total: 2, page: 1, pageSize: 1, totalPages: 2 });
      expect(secondPage.meta).toEqual({ total: 2, page: 2, pageSize: 1, totalPages: 2 });
    }

    const firstPage = await store.listPosts(undefined, 1, 3);
    const secondPage = await store.listPosts(undefined, 2, 3);
    expect([...firstPage.data, ...secondPage.data].map(({ id }) => id)).toEqual([
      "post-6",
      "post-5",
      "post-4",
      "post-3",
      "post-2",
      "post-1",
    ]);
    expect(firstPage.meta).toEqual({ total: 6, page: 1, pageSize: 3, totalPages: 2 });
    expect(secondPage.meta).toEqual({ total: 6, page: 2, pageSize: 3, totalPages: 2 });
  });

  it("uses the Firestore category equality plus createdAt descending query for every category", async () => {
    process.env.JOB_STORE_BACKEND = "firestore";
    process.env.FIRESTORE_BOARD_POSTS_COLLECTION = "boardPosts";
    firestoreState.posts = categories.flatMap((category, index) => [
      post(`${category}-old`, category, `2026-01-01T00:0${index}:00.000Z`),
      post(`${category}-new`, category, `2026-01-01T01:0${index}:00.000Z`),
    ]);

    const { boardStore } = await import("./board-store.js");

    for (const category of categories) {
      firestoreState.operations = [];
      const page = await boardStore.listPosts(category, 2, 1);

      expect(page.data.map(({ id }) => id)).toEqual([`${category}-old`]);
      expect(page.meta).toEqual({ total: 2, page: 2, pageSize: 1, totalPages: 2 });
      expect(firestoreState.operations).toEqual([
        ["where", "category", "==", category],
        ["orderBy", "createdAt", "desc"],
        ["count"],
        ["count.get"],
        ["limit", 1],
        ["offset", 1],
        ["get"],
      ]);
    }
    expect(firestoreState.collectionName).toBe("boardPosts");
  });

  it("uses createdAt descending order and stable offset pagination without a category filter", async () => {
    process.env.JOB_STORE_BACKEND = "firestore";
    firestoreState.posts = [
      post("oldest", "general", "2026-01-01T00:00:00.000Z"),
      post("middle", "qna", "2026-01-02T00:00:00.000Z"),
      post("newest", "notice", "2026-01-03T00:00:00.000Z"),
    ];

    const { boardStore } = await import("./board-store.js");
    const firstPage = await boardStore.listPosts(undefined, 1, 2);
    firestoreState.operations = [];
    const secondPage = await boardStore.listPosts(undefined, 2, 2);

    expect(firstPage.data.map(({ id }) => id)).toEqual(["newest", "middle"]);
    expect(secondPage.data.map(({ id }) => id)).toEqual(["oldest"]);
    expect(secondPage.meta).toEqual({ total: 3, page: 2, pageSize: 2, totalPages: 2 });
    expect(firestoreState.operations).toEqual([
      ["orderBy", "createdAt", "desc"],
      ["count"],
      ["count.get"],
      ["limit", 2],
      ["offset", 2],
      ["get"],
    ]);
  });
});

describe("board store Firestore index declaration", () => {
  it("preserves the jobs index and declares the board category plus createdAt query", async () => {
    const repositoryRoot = path.resolve(process.cwd(), "../..");
    const indexes = JSON.parse(
      await readFile(path.join(repositoryRoot, "firestore.indexes.json"), "utf8"),
    ) as {
      indexes: Array<{
        collectionGroup: string;
        queryScope: string;
        fields: Array<{ fieldPath: string; order: string }>;
      }>;
      fieldOverrides: unknown[];
    };
    const firebaseConfig = JSON.parse(
      await readFile(path.join(repositoryRoot, "firebase.json"), "utf8"),
    ) as { firestore?: { indexes?: string } };

    expect(indexes.indexes).toContainEqual({
      collectionGroup: "jobs",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "ownerType", order: "ASCENDING" },
        { fieldPath: "userId", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" },
      ],
    });
    expect(indexes.indexes).toContainEqual({
      collectionGroup: "boardPosts",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "category", order: "ASCENDING" },
        { fieldPath: "createdAt", order: "DESCENDING" },
      ],
    });
    expect(indexes.fieldOverrides).toEqual([]);
    expect(firebaseConfig.firestore?.indexes).toBe("firestore.indexes.json");
  });
});
