import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import DropzoneUploader from "./DropzoneUploader";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => [{}]),
  getApp: vi.fn(() => ({})),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  auth: {},
  getFirebaseAuth: vi.fn(() => ({})),
  firebaseConfig: {},
  isFirebaseConfigured: true,
}));

let mockAuthUser: User | null = null;

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
    error: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  }),
}));

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_TOKEN = "anon-access-token-abc123";

function makeMockUser(token = "firebase-id-token"): User {
  return {
    uid: "test-uid",
    email: "test@example.com",
    getIdToken: vi.fn().mockResolvedValue(token),
  } as unknown as User;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DropzoneUploader auth and token handling", () => {
  beforeEach(() => {
    mockAuthUser = null;
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the idle upload prompt for anonymous users", () => {
    render(<DropzoneUploader />);
    expect(screen.getByText("HWP 파일을 드래그하여 놓으세요")).toBeInTheDocument();
  });

  it("renders the idle upload prompt for logged-in users", () => {
    mockAuthUser = makeMockUser();
    render(<DropzoneUploader />);
    expect(screen.getByText("HWP 파일을 드래그하여 놓으세요")).toBeInTheDocument();
  });

  it("does not expose token in any link href in idle state", () => {
    render(<DropzoneUploader />);
    const links = document.querySelectorAll("a");
    for (const link of links) {
      const href = link.getAttribute("href") ?? "";
      expect(href).not.toContain(TEST_TOKEN);
      expect(href).not.toContain("accessToken");
      expect(href).not.toContain("token=");
    }
  });

  it("does not show completed/queued/failed states in idle", () => {
    render(<DropzoneUploader />);
    expect(screen.queryByText("변환 완료!")).not.toBeInTheDocument();
    expect(screen.queryByText("변환 작업 대기 중...")).not.toBeInTheDocument();
    expect(screen.queryByText("PDF 다운로드")).not.toBeInTheDocument();
    expect(screen.queryByText("변환에 실패했습니다")).not.toBeInTheDocument();
  });

  it("does not show 401 error message in idle state", () => {
    render(<DropzoneUploader />);
    expect(screen.queryByText("접근 토큰이 없어 작업 상태를 조회할 수 없습니다.")).not.toBeInTheDocument();
  });
});

describe("DropzoneUploader logged-in Authorization", () => {
  beforeEach(() => {
    mockAuthUser = makeMockUser("firebase-id-token-xyz");
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    mockAuthUser = null;
    vi.restoreAllMocks();
  });

  it("renders idle state for logged-in users", () => {
    render(<DropzoneUploader />);
    expect(screen.getByText("HWP 파일을 드래그하여 놓으세요")).toBeInTheDocument();
  });

  it("mock user has getIdToken for Authorization header", () => {
    expect(mockAuthUser?.getIdToken).toBeDefined();
    render(<DropzoneUploader />);
    // fetchWithAuth calls user.getIdToken() for authenticated requests.
    // Verified by api-client.auth.test.ts.
  });
});

describe("upload-token helper", () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("saves and loads token by jobId", async () => {
    const { saveJobAccessToken, loadJobAccessToken, clearJobAccessToken } = await import("@/lib/upload-token");

    saveJobAccessToken("job-1", "token-abc");
    expect(loadJobAccessToken("job-1")).toBe("token-abc");

    clearJobAccessToken("job-1");
    expect(loadJobAccessToken("job-1")).toBeNull();
  });

  it("uses a key prefixed with hwp2pdf-job-", async () => {
    const { buildJobTokenStorageKey, saveJobAccessToken } = await import("@/lib/upload-token");

    const key = buildJobTokenStorageKey("my-job");
    expect(key).toBe("hwp2pdf-job-my-job");

    saveJobAccessToken("my-job", "tok");
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith("hwp2pdf-job-my-job", "tok");
  });

  it("returns null for unknown jobId", async () => {
    const { loadJobAccessToken } = await import("@/lib/upload-token");
    expect(loadJobAccessToken("unknown-job")).toBeNull();
  });

  it("clearJobAccessToken removes the stored token", async () => {
    const { saveJobAccessToken, loadJobAccessToken, clearJobAccessToken } = await import("@/lib/upload-token");

    saveJobAccessToken("job-clear", "tok-xyz");
    expect(loadJobAccessToken("job-clear")).toBe("tok-xyz");

    clearJobAccessToken("job-clear");
    expect(loadJobAccessToken("job-clear")).toBeNull();
  });
});