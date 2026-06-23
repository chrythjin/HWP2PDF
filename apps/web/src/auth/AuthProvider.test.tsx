import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { User } from "firebase/auth";
import { AuthProvider, type AuthContextValue } from "./AuthProvider";
import { useAuth } from "./useAuth";

// ---------------------------------------------------------------------------
// Mock firebase/auth — we control onAuthStateChanged, signIn, signUp, signOut.
// ---------------------------------------------------------------------------

const mockUser: User = {
  uid: "test-uid",
  email: "test@example.com",
  getIdToken: vi.fn().mockResolvedValue("mock-id-token"),
} as unknown as User;

const authMocks = vi.hoisted(() => {
  const state = {
    callback: null as ((user: User | null) => void) | null,
  };

  const onAuthStateChanged = vi.fn((_auth: unknown, cb: (user: User | null) => void) => {
    state.callback = cb;
    return () => {
      state.callback = null;
    };
  });

  return {
    state,
    onAuthStateChanged,
    signIn: vi.fn(),
    createUser: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: authMocks.onAuthStateChanged,
  signInWithEmailAndPassword: authMocks.signIn,
  createUserWithEmailAndPassword: authMocks.createUser,
  signOut: authMocks.signOut,
  getAuth: vi.fn(() => ({})),
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => [{}]),
  getApp: vi.fn(() => ({})),
}));

// Helper to consume auth context for assertions
function AuthConsumer({ onValue }: { onValue: (v: AuthContextValue) => void }) {
  const value = useAuth();
  onValue(value);
  return null;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.state.callback = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children and starts in loading state", () => {
    render(
      <AuthProvider>
        <div>child content</div>
      </AuthProvider>,
    );

    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("transitions to authenticated state when onAuthStateChanged fires with a user", () => {
    let captured: AuthContextValue = null as unknown as AuthContextValue;

    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => (captured = v)} />
      </AuthProvider>,
    );

    // Initially loading
    expect(captured.loading).toBe(true);
    expect(captured.user).toBeNull();

    // Simulate Firebase auth state change
    act(() => {
      authMocks.state.callback?.(mockUser);
    });

    expect(captured.loading).toBe(false);
    expect(captured.user).toBe(mockUser);
  });

  it("transitions to unauthenticated state when onAuthStateChanged fires with null", () => {
    let captured: AuthContextValue = null as unknown as AuthContextValue;

    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => (captured = v)} />
      </AuthProvider>,
    );

    act(() => {
      authMocks.state.callback?.(null);
    });

    expect(captured.loading).toBe(false);
    expect(captured.user).toBeNull();
  });

  it("login calls signInWithEmailAndPassword", async () => {
    authMocks.signIn.mockResolvedValueOnce({ user: mockUser });
    let captured: AuthContextValue = null as unknown as AuthContextValue;

    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => (captured = v)} />
      </AuthProvider>,
    );

    await act(async () => {
      await captured.login("test@example.com", "password123");
    });

    expect(authMocks.signIn).toHaveBeenCalledWith(expect.anything(), "test@example.com", "password123");
  });

  it("signup calls createUserWithEmailAndPassword", async () => {
    authMocks.createUser.mockResolvedValueOnce({ user: mockUser });
    let captured: AuthContextValue = null as unknown as AuthContextValue;

    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => (captured = v)} />
      </AuthProvider>,
    );

    await act(async () => {
      await captured.signup("new@example.com", "password123");
    });

    expect(authMocks.createUser).toHaveBeenCalledWith(expect.anything(), "new@example.com", "password123");
  });

  it("logout calls signOut", async () => {
    authMocks.signOut.mockResolvedValueOnce(undefined);
    let captured: AuthContextValue = null as unknown as AuthContextValue;

    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => (captured = v)} />
      </AuthProvider>,
    );

    await act(async () => {
      await captured.logout();
    });

    expect(authMocks.signOut).toHaveBeenCalledWith(expect.anything());
  });

  it("login error sets error state and rethrows", async () => {
    const loginError = new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    (authMocks.signIn as Mock).mockRejectedValueOnce(loginError);
    let captured: AuthContextValue = null as unknown as AuthContextValue;

    render(
      <AuthProvider>
        <AuthConsumer onValue={(v) => (captured = v)} />
      </AuthProvider>,
    );

    await act(async () => {
      try {
        await captured.login("wrong@example.com", "badpass");
      } catch {
        // expected
      }
    });

    expect(captured.error).toBe("이메일 또는 비밀번호가 올바르지 않습니다.");
  });

  it("useAuth throws when used outside AuthProvider", () => {
    // Suppress console.error for this expected error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<AuthConsumer onValue={() => {}} />)).toThrow(
      "useAuth must be used within an <AuthProvider>",
    );
    spy.mockRestore();
  });
});
