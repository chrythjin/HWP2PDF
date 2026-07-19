import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import MobileNav from "./MobileNav";

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
let mockLogout = vi.fn();

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
    error: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: mockLogout,
    clearError: vi.fn(),
  }),
}));

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockUser(): User {
  return {
    uid: "test-uid",
    email: "test@example.com",
    getIdToken: vi.fn().mockResolvedValue("token"),
  } as unknown as User;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MobileNav", () => {
  beforeEach(() => {
    mockAuthUser = null;
    mockPathname = "/";
    mockLogout = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing for anonymous users", () => {
    render(<MobileNav />);
    expect(screen.queryByTestId("mobile-nav")).not.toBeInTheDocument();
  });

  it("renders the hamburger trigger for authenticated users", () => {
    mockAuthUser = makeMockUser();
    render(<MobileNav />);
    expect(screen.getByTestId("mobile-nav-trigger")).toBeInTheDocument();
  });

  it("trigger has aria-expanded=false initially and aria-controls pointing to panel", () => {
    mockAuthUser = makeMockUser();
    render(<MobileNav />);
    const trigger = screen.getByTestId("mobile-nav-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls");
  });

  it("opens the panel on Enter and sets aria-expanded=true", async () => {
    const user = userEvent.setup();
    mockAuthUser = makeMockUser();
    render(<MobileNav />);

    const trigger = screen.getByTestId("mobile-nav-trigger");
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("mobile-nav-panel")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("opens the panel on click and sets aria-expanded=true", async () => {
    const user = userEvent.setup();
    mockAuthUser = makeMockUser();
    render(<MobileNav />);

    await user.click(screen.getByTestId("mobile-nav-trigger"));

    expect(screen.getByTestId("mobile-nav-panel")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-trigger")).toHaveAttribute("aria-expanded", "true");
  });
  it("closes the panel on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    mockAuthUser = makeMockUser();
    render(<MobileNav />);

    const trigger = screen.getByTestId("mobile-nav-trigger");
    await user.click(trigger);
    expect(screen.getByTestId("mobile-nav-panel")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByTestId("mobile-nav-panel")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes on trigger click toggle (open -> close)", async () => {
    const user = userEvent.setup();
    mockAuthUser = makeMockUser();
    render(<MobileNav />);

    const trigger = screen.getByTestId("mobile-nav-trigger");
    await user.click(trigger);
    expect(screen.getByTestId("mobile-nav-panel")).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByTestId("mobile-nav-panel")).not.toBeInTheDocument();
  });

  it("renders home, history, and board links in the panel", async () => {
    const user = userEvent.setup();
    mockAuthUser = makeMockUser();
    render(<MobileNav />);

    await user.click(screen.getByTestId("mobile-nav-trigger"));

    expect(screen.getByTestId("mobile-nav-link-home")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-link-history")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-link-board")).toBeInTheDocument();
  });

  it("marks the current route with aria-current=page", async () => {
    const user = userEvent.setup();
    mockAuthUser = makeMockUser();
    mockPathname = "/history";
    render(<MobileNav />);

    await user.click(screen.getByTestId("mobile-nav-trigger"));

    const historyLink = screen.getByTestId("mobile-nav-link-history");
    expect(historyLink).toHaveAttribute("aria-current", "page");

    const homeLink = screen.getByTestId("mobile-nav-link-home");
    expect(homeLink).not.toHaveAttribute("aria-current", "page");
  });

  it("marks home as current when pathname is /", async () => {
    const user = userEvent.setup();
    mockAuthUser = makeMockUser();
    mockPathname = "/";
    render(<MobileNav />);

    await user.click(screen.getByTestId("mobile-nav-trigger"));

    const homeLink = screen.getByTestId("mobile-nav-link-home");
    expect(homeLink).toHaveAttribute("aria-current", "page");
  });

  it("marks board as current for /board sub-routes", async () => {
    const user = userEvent.setup();
    mockAuthUser = makeMockUser();
    mockPathname = "/board/123";
    render(<MobileNav />);

    await user.click(screen.getByTestId("mobile-nav-trigger"));

    const boardLink = screen.getByTestId("mobile-nav-link-board");
    expect(boardLink).toHaveAttribute("aria-current", "page");
  });

  it("trigger has accessible label that toggles with state", async () => {
    const user = userEvent.setup();
    mockAuthUser = makeMockUser();
    render(<MobileNav />);

    const trigger = screen.getByTestId("mobile-nav-trigger");
    expect(trigger).toHaveAttribute("aria-label", "내비게이션 열기");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-label", "내비게이션 닫기");
  });

  it("closes panel when a navigation link is clicked", async () => {
    const user = userEvent.setup();
    mockAuthUser = makeMockUser();
    mockPathname = "/";
    render(<MobileNav />);

    await user.click(screen.getByTestId("mobile-nav-trigger"));
    expect(screen.getByTestId("mobile-nav-panel")).toBeInTheDocument();

    // Clicking a nav link should close the panel (onClick={closePanel})
    await user.click(screen.getByTestId("mobile-nav-link-history"));

    expect(screen.queryByTestId("mobile-nav-panel")).not.toBeInTheDocument();
  });

  it("Tab cycles within the panel (focus trap)", async () => {
    const user = userEvent.setup();
    mockAuthUser = makeMockUser();
    render(<MobileNav />);

    await user.click(screen.getByTestId("mobile-nav-trigger"));
    const panel = screen.getByTestId("mobile-nav-panel");

    // Focus the last link, then Tab should wrap to the first focusable.
    const links = panel.querySelectorAll('a[href], button:not([disabled])');
    const lastElement = links[links.length - 1] as HTMLElement;
    lastElement.focus();
    expect(lastElement).toHaveFocus();

    // Dispatch a Tab keydown on the focused element; the panel's onKeyDown
    // handler (tab-trap) should call preventDefault and move focus to the
    // first focusable element.
    fireEvent.keyDown(lastElement, { key: "Tab", shiftKey: false });

    const firstElement = links[0] as HTMLElement;
    expect(firstElement).toHaveFocus();
  });

  it("Shift+Tab wraps from first to last focusable in panel", async () => {
    const user = userEvent.setup();
    mockAuthUser = makeMockUser();
    render(<MobileNav />);

    await user.click(screen.getByTestId("mobile-nav-trigger"));
    const panel = screen.getByTestId("mobile-nav-panel");

    const links = panel.querySelectorAll('a[href], button:not([disabled])');
    const firstElement = links[0] as HTMLElement;
    firstElement.focus();
    expect(firstElement).toHaveFocus();

    fireEvent.keyDown(firstElement, { key: "Tab", shiftKey: true });

    const lastElement = links[links.length - 1] as HTMLElement;
    expect(lastElement).toHaveFocus();
  });
});
