import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import { ANONYMOUS_ACCESS_TOKEN_HEADER } from "@hwp2pdf/shared";
import { downloadProtectedFile } from "./download-file";

const AUTH_DOWNLOAD_URL = "http://localhost:8080/v1/jobs/job-download-auth/download";
const ANON_DOWNLOAD_URL = "http://localhost:8080/v1/jobs/job-download-anon/download";
const TEST_ID_TOKEN = "test-id-token";
const ANON_TOKEN = "anon-token-123";

function makeUser(token = TEST_ID_TOKEN): User {
  return {
    getIdToken: vi.fn().mockResolvedValue(token),
  } as unknown as User;
}

function okPdfResponse(): Response {
  return new Response(new Blob(["%PDF-1.4"], { type: "application/pdf" }), {
    status: 200,
    headers: { "Content-Type": "application/pdf" },
  });
}

function getFetchCall() {
  const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
  if (!call) throw new Error("fetch was not called");
  return call;
}

function getFetchHeaders(): Headers {
  const [, init] = getFetchCall();
  return init?.headers as Headers;
}

function getFetchUrl(): string {
  const [url] = getFetchCall();
  return String(url);
}

function expectNoTokenLeak(url: string) {
  expect(url).not.toContain(ANON_TOKEN);
  expect(url).not.toContain("accessToken");
  expect(url).not.toContain("token=");
}

describe("downloadProtectedFile", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let originalCreateElement: typeof document.createElement;
  let anchorClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalCreateElement = document.createElement.bind(document);

    globalThis.fetch = vi.fn().mockResolvedValue(okPdfResponse());
    URL.createObjectURL = vi.fn(() => "blob:download-url");
    URL.revokeObjectURL = vi.fn();
    anchorClick = vi.fn();

    vi.spyOn(document.body, "appendChild");
    vi.spyOn(document.body, "removeChild");
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName.toLowerCase() === "a") {
        Object.defineProperty(element, "click", {
          configurable: true,
          value: anchorClick,
        });
      }
      return element;
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("sends Firebase bearer credentials for logged-in protected downloads", async () => {
    const user = makeUser();

    await downloadProtectedFile({
      url: AUTH_DOWNLOAD_URL,
      user,
      filename: "logged-in.pdf",
    });

    expect(user.getIdToken).toHaveBeenCalledTimes(1);
    expect(getFetchUrl()).toBe(AUTH_DOWNLOAD_URL);
    expect(getFetchHeaders().get("Authorization")).toBe(`Bearer ${TEST_ID_TOKEN}`);
  });

  it("sends anonymous job token only in the shared header for anonymous protected downloads", async () => {
    await downloadProtectedFile({
      url: ANON_DOWNLOAD_URL,
      user: null,
      anonymousJobToken: ANON_TOKEN,
      filename: "anonymous.pdf",
    });

    expect(getFetchUrl()).toBe(ANON_DOWNLOAD_URL);
    expect(getFetchHeaders().get(ANONYMOUS_ACCESS_TOKEN_HEADER)).toBe(ANON_TOKEN);
    expect(getFetchHeaders().get("Authorization")).toBeNull();
  });

  it("never appends anonymous token material to the requested URL", async () => {
    await downloadProtectedFile({
      url: ANON_DOWNLOAD_URL,
      user: null,
      anonymousJobToken: ANON_TOKEN,
      filename: "anonymous.pdf",
    });

    expectNoTokenLeak(getFetchUrl());
  });

  it.each([
    [401, "인증이 필요합니다."],
    [403, "다운로드 권한이 없습니다."],
    [500, "PDF 다운로드에 실패했습니다."],
  ])("throws a safe error for HTTP %i responses", async (status, message) => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("sensitive backend detail", { status }));

    await expect(
      downloadProtectedFile({
        url: AUTH_DOWNLOAD_URL,
        user: makeUser(),
        filename: "failed.pdf",
      }),
    ).rejects.toThrow(message);

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("does not create a browser download for a non-PDF success response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("non-download response", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
    );

    await expect(
      downloadProtectedFile({
        url: AUTH_DOWNLOAD_URL,
        user: makeUser(),
        filename: "failed.pdf",
      }),
    ).rejects.toThrow("PDF 다운로드에 실패했습니다.");

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(document.createElement).not.toHaveBeenCalledWith("a");
    expect(anchorClick).not.toHaveBeenCalled();
    expect(document.body.appendChild).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("downloads the PDF blob with an object URL and revokes it after click", async () => {
    await downloadProtectedFile({
      url: AUTH_DOWNLOAD_URL,
      user: makeUser(),
      filename: "converted.pdf",
    });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(document.body.appendChild).toHaveBeenCalledTimes(1);
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(document.body.removeChild).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:download-url");
  });
});
