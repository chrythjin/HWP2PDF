import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import { fetchWithAuth, getIdTokenOrNull } from "./api-client";

describe("fetchWithAuth", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok"));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("adds Authorization bearer token for authenticated users", async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue("test-token"),
    } as unknown as User;

    await fetchWithAuth("/v1/jobs", user, {
      method: "GET",
      headers: {
        "X-Test": "yes",
      },
    });

    expect(user.getIdToken).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(headers.get("X-Test")).toBe("yes");
  });

  it("omits Authorization header for anonymous users", async () => {
    await fetchWithAuth("/v1/jobs", null, {
      method: "GET",
      headers: {
        "X-Test": "yes",
      },
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("X-Test")).toBe("yes");
  });

  it("returns null token for anonymous users", async () => {
    await expect(getIdTokenOrNull(null)).resolves.toBeNull();
  });

  it("returns Firebase ID token for authenticated users", async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue("test-token"),
    } as unknown as User;

    await expect(getIdTokenOrNull(user)).resolves.toBe("test-token");
    expect(user.getIdToken).toHaveBeenCalledTimes(1);
  });
});
