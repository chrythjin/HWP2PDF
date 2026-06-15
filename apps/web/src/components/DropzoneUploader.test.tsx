import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DropzoneUploader from "./DropzoneUploader";

describe("DropzoneUploader", () => {
  it("renders the idle upload prompt", () => {
    render(<DropzoneUploader />);

    expect(screen.getByText("HWP 파일을 드래그하여 놓으세요")).toBeInTheDocument();
  });
});
