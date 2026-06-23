import { render, screen, waitFor, act, fireEvent, cleanup, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { User } from "firebase/auth";
import { AuthProvider } from "@/auth/AuthProvider";
import HistoryPage from "./page";

// ---------------------------------------------------------------------------
// Mock firebase/auth and @/lib/firebase so AuthProvider works in tests.
// ---------------------------------------------------------------------------

const mockUser: User = {
  uid: "test-uid",
  email: "test@example.com",
  getIdToken: vi.fn().mockResolvedValue("mock-id-token"),
} as unknown as User;

let authStateCallback: ((user: User | null) => void) | null = null;

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: User | null) => void) => {
    authStateCallback = cb;
    return () => {
      authStateCallback = null;
    };
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  getAuth: vi.fn(() => ({})),
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => [{}]),
  getApp: vi.fn(() => ({})),
}));

// Mock next/navigation useRouter so redirect logic doesn't crash in jsdom.
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush, refresh: mockPush }),
}));

// ---------------------------------------------------------------------------
// Fetch mock — controls /v1/me/jobs list and DELETE responses.
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

function mockFetchJobs(jobs: unknown[]) {
  (globalThis.fetch as Mock).mockImplementation(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/v1/me/jobs") && (!init?.method || init.method === "GET")) {
      return new Response(JSON.stringify(jobs), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (u.includes("/v1/me/jobs/") && init?.method === "DELETE") {
      return new Response(JSON.stringify({ ok: true, jobId: "job-1", status: "deleted" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("not found", { status: 404 });
  });
}

function renderHistory() {
  return render(
    <AuthProvider>
      <HistoryPage />
    </AuthProvider>,
  );
}

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    globalThis.fetch = vi.fn();
    mockPush.mockReset();
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ---- Unauthenticated state shows login prompt ----
  it("shows login prompt when unauthenticated", () => {
    renderHistory();

    act(() => {
      authStateCallback?.(null);
    });

    expect(screen.getByTestId("history-login-prompt")).toBeInTheDocument();
    // The login prompt contains a "로그인" link (the header AuthNav also has one).
    const prompt = screen.getByTestId("history-login-prompt");
    expect(within(prompt).getByText("로그인")).toBeInTheDocument();
  });

  // ---- Authenticated: renders mocked jobs ----
  it("renders the authenticated user's jobs after fetch", async () => {
    mockFetchJobs([
      {
        jobId: "job-1",
        status: "completed",
        createdAt: "2026-06-20T10:00:00.000Z",
        downloadExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      },
    ]);

    renderHistory();

    act(() => {
      authStateCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByText("job-1")).toBeInTheDocument();
    });
  });

  // ---- Expired download label appears ----
  it("shows expired download label when downloadExpiresAt is in the past", async () => {
    mockFetchJobs([
      {
        jobId: "job-expired",
        status: "completed",
        createdAt: "2026-06-20T10:00:00.000Z",
        downloadExpiresAt: "2020-01-01T00:00:00.000Z",
      },
    ]);

    renderHistory();

    act(() => {
      authStateCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByText("job-expired")).toBeInTheDocument();
    });

    expect(screen.getByTestId("download-expired-label")).toBeInTheDocument();
  });

  // ---- Delete confirmation calls API with Authorization ----
  it("calls DELETE with Authorization header after confirmation", async () => {
    // window.confirm stub
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    mockFetchJobs([
      {
        jobId: "job-1",
        status: "completed",
        createdAt: "2026-06-20T10:00:00.000Z",
        downloadExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      },
    ]);

    renderHistory();

    act(() => {
      authStateCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByText("job-1")).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId("delete-button-job-1");
    await act(async () => {
      fireEvent.click(deleteButton);
      // Flush the async handleDelete: getIdToken -> fetch -> state update.
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(confirmSpy).toHaveBeenCalled();

    // Find the DELETE fetch call.
    const calls = (globalThis.fetch as Mock).mock.calls;
    const deleteCall = calls.find(
      ([url, init]) =>
        String(url).includes("/v1/me/jobs/") && init?.method === "DELETE",
    );

    expect(deleteCall).toBeDefined();
    const init = deleteCall![1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer mock-id-token");

    confirmSpy.mockRestore();
  });

  // ---- Deleted row disappears after success ----
  it("removes the deleted row from the list after successful delete", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    mockFetchJobs([
      {
        jobId: "job-1",
        status: "completed",
        createdAt: "2026-06-20T10:00:00.000Z",
        downloadExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      },
      {
        jobId: "job-2",
        status: "completed",
        createdAt: "2026-06-21T10:00:00.000Z",
        downloadExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      },
    ]);

    renderHistory();

    act(() => {
      authStateCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByText("job-1")).toBeInTheDocument();
      expect(screen.getByText("job-2")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-button-job-1"));
    });

    await waitFor(() => {
      expect(screen.queryByText("job-1")).not.toBeInTheDocument();
    });
    expect(screen.getByText("job-2")).toBeInTheDocument();
  });

  // ---- 401/403 graceful handling ----
  it("shows login prompt when API returns 401", async () => {
    (globalThis.fetch as Mock).mockImplementation(async () => {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "인증이 필요합니다." } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderHistory();

    act(() => {
      authStateCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByTestId("history-auth-error")).toBeInTheDocument();
    });
  });

  it("shows forbidden message when API returns 403", async () => {
    (globalThis.fetch as Mock).mockImplementation(async () => {
      return new Response(JSON.stringify({ error: { code: "forbidden", message: "접근 권한이 없습니다." } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderHistory();

    act(() => {
      authStateCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByTestId("history-auth-error")).toBeInTheDocument();
    });
  });
});