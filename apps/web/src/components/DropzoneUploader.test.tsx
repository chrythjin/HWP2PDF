import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DropzoneUploader from "./DropzoneUploader";

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  }),
}));

describe("DropzoneUploader", () => {
  it("renders the idle upload prompt", () => {
    render(<DropzoneUploader />);

    expect(screen.getByText("HWP 파일을 드래그하여 놓으세요")).toBeInTheDocument();
  });
});
