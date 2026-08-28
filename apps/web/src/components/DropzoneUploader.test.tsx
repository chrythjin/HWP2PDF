import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DropzoneUploader from "./DropzoneUploader";

let onDrop: ((acceptedFiles: File[], rejectedFiles: { errors: { code: string }[] }[]) => void) | undefined;

vi.mock("react-dropzone", () => ({
  useDropzone: (options: typeof onDrop extends undefined ? never : { onDrop: NonNullable<typeof onDrop> }) => {
    onDrop = options.onDrop;
    return {
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: false,
    };
  },
}));

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

  it("shows the Korean HWP-only message for a rejected non-HWP file", () => {
    render(<DropzoneUploader />);

    act(() => {
      onDrop?.([], [{ errors: [{ code: "file-invalid-type" }] }]);
    });

    expect(screen.getByText("현재는 .hwp 파일만 지원합니다.")).toBeInTheDocument();
  });
});
