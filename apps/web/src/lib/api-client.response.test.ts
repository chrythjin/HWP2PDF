import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import {
  ApiClientError,
  fetchBlobWithAuth,
  fetchJsonWithAuth,
} from "./api-client";

interface TestPayload {
  value: string;
}

function isTestPayload(value: unknown): value is TestPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof value.value === "string"
  );
}

function expectApiError(
  promise: Promise<unknown>,
  code: ApiClientError["code"],
  status: number | null,
) {
  return expect(promise).rejects.toMatchObject({
    name: "ApiClientError",
    code,
    status,
  });
}

describe("authenticated API response parsers", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns guarded JSON and preserves the bearer header", async () => {
    const user = {
      getIdToken: vi.fn().mockResolvedValue("test-token"),
    } as unknown as User;
    globalThis.fetch = vi.fn().mockResolvedValue(
      Response.json({ value: "ok" }),
    );

    await expect(
      fetchJsonWithAuth("/v1/test", user, isTestPayload),
    ).resolves.toEqual({ value: "ok" });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [429, "rate_limited"],
    [500, "server_error"],
    [503, "server_error"],
  ] as const)("classifies HTTP %i without exposing its body", async (status, code) => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("sensitive backend detail", { status }),
    );

    await expectApiError(
      fetchJsonWithAuth("/v1/test", null, isTestPayload),
      code,
      status,
    );
  });

  it("classifies a rejected fetch as a network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("private network detail"));

    await expectApiError(
      fetchJsonWithAuth("/v1/test", null, isTestPayload),
      "network_error",
      null,
    );
  });

  it("rejects malformed JSON", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expectApiError(
      fetchJsonWithAuth("/v1/test", null, isTestPayload),
      "malformed_body",
      200,
    );
  });

  it("rejects valid JSON that fails the runtime guard", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(Response.json({ value: 42 }));

    await expectApiError(
      fetchJsonWithAuth("/v1/test", null, isTestPayload),
      "malformed_body",
      200,
    );
  });

  it("returns a non-empty PDF Blob with a normalized PDF content type", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(new Blob(["%PDF-1.4"], { type: "application/pdf" }), {
        status: 200,
        headers: { "Content-Type": "Application/PDF; charset=binary" },
      }),
    );

    const blob = await fetchBlobWithAuth("/v1/test.pdf", null);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("accepts the permitted generic binary download content type", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(new Blob(["%PDF-1.4"], { type: "application/octet-stream" }), {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      }),
    );

    await expect(fetchBlobWithAuth("/v1/test.pdf", null)).resolves.toBeInstanceOf(Blob);
  });

  it.each([
    "application/json",
    "text/html; charset=utf-8",
    "text/plain",
  ])("rejects a non-download success content type: %s", async (contentType) => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("non-download response", {
        status: 200,
        headers: { "Content-Type": contentType },
      }),
    );

    await expectApiError(
      fetchBlobWithAuth("/v1/test.pdf", null),
      "malformed_body",
      200,
    );
  });

  it("rejects an empty Blob body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      }),
    );

    await expectApiError(
      fetchBlobWithAuth("/v1/test.pdf", null),
      "malformed_body",
      200,
    );
  });

  it("classifies a failed Blob response before reading its body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("sensitive backend detail", { status: 403 }),
    );

    await expectApiError(
      fetchBlobWithAuth("/v1/test.pdf", null),
      "forbidden",
      403,
    );
  });
});
