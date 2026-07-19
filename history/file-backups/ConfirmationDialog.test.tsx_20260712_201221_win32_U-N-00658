import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConfirmationDialog from "./ConfirmationDialog";

// ---------------------------------------------------------------------------
// T8: ConfirmationDialog — reusable accessible delete confirmation dialog.
//
// Verifies the full keyboard and ARIA contract:
//   - role="alertdialog", aria-modal="true", aria-labelledby, aria-describedby
//   - initial focus moves to the cancel button
//   - Tab/Shift+Tab cycle within the dialog (focus trap)
//   - Escape closes (when not busy)
//   - Cancel button closes
//   - Confirm calls onConfirm and shows busy state while pending
//   - Trigger focus is restored on close
//   - Background click does NOT close the dialog (non-interaction)
// ---------------------------------------------------------------------------

describe("ConfirmationDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing when open is false", () => {
    render(
      <ConfirmationDialog
        open={false}
        title="Test"
        description="Desc"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders alertdialog with aria-modal, aria-labelledby, and aria-describedby", () => {
    render(
      <ConfirmationDialog
        open={true}
        title="삭제할까요?"
        description="복구할 수 없습니다."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "confirmation-dialog-title");
    expect(dialog).toHaveAttribute("aria-describedby", "confirmation-dialog-description");

    // The labelledby element must contain the title text.
    const titleEl = document.getElementById("confirmation-dialog-title");
    expect(titleEl?.textContent).toBe("삭제할까요?");

    // The describedby element must contain the description text.
    const descEl = document.getElementById("confirmation-dialog-description");
    expect(descEl?.textContent).toBe("복구할 수 없습니다.");
  });

  it("moves initial focus to the cancel button on open", () => {
    render(
      <ConfirmationDialog
        open={true}
        title="Test"
        description="Desc"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByTestId("confirmation-cancel")).toHaveFocus();
  });

  it("traps Tab focus within the dialog (Tab from last wraps to first)", () => {
    render(
      <ConfirmationDialog
        open={true}
        title="Test"
        description="Desc"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const confirm = screen.getByTestId("confirmation-confirm");
    confirm.focus();
    expect(confirm).toHaveFocus();

    // Tab from the last focusable (confirm) should wrap to the first (cancel).
    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    fireEvent(document, tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(screen.getByTestId("confirmation-cancel")).toHaveFocus();
  });

  it("traps Shift+Tab focus within the dialog (Shift+Tab from first wraps to last)", () => {
    render(
      <ConfirmationDialog
        open={true}
        title="Test"
        description="Desc"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const cancel = screen.getByTestId("confirmation-cancel");
    expect(cancel).toHaveFocus();

    // Shift+Tab from the first focusable (cancel) should wrap to the last (confirm).
    const shiftTab = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true });
    fireEvent(document, shiftTab);
    expect(shiftTab.defaultPrevented).toBe(true);
    expect(screen.getByTestId("confirmation-confirm")).toHaveFocus();
  });

  it("closes on Escape when not busy", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmationDialog
        open={true}
        title="Test"
        description="Desc"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not close on Escape when busy", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmationDialog
        open={true}
        title="Test"
        description="Desc"
        busy={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when the cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmationDialog
        open={true}
        title="Test"
        description="Desc"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByTestId("confirmation-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        open={true}
        title="Test"
        description="Desc"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("confirmation-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows busy label and disables both buttons when busy is true", () => {
    render(
      <ConfirmationDialog
        open={true}
        title="Test"
        description="Desc"
        busy={true}
        confirmLabel="삭제"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const confirm = screen.getByTestId("confirmation-confirm") as HTMLButtonElement;
    expect(confirm).toBeDisabled();
    expect(confirm.textContent).toBe("처리 중...");

    const cancel = screen.getByTestId("confirmation-cancel") as HTMLButtonElement;
    expect(cancel).toBeDisabled();
  });

  it("uses custom confirm and cancel labels when provided", () => {
    render(
      <ConfirmationDialog
        open={true}
        title="Test"
        description="Desc"
        confirmLabel="삭제하기"
        cancelLabel="취소하기"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByTestId("confirmation-confirm").textContent).toBe("삭제하기");
    expect(screen.getByTestId("confirmation-cancel").textContent).toBe("취소하기");
  });

  it("restores focus to the trigger element on close", () => {
    const { rerender } = render(
      <>
        <button data-testid="trigger">Open</button>
        <ConfirmationDialog
          open={false}
          title="Test"
          description="Desc"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </>,
    );

    // Focus the trigger, then open the dialog.
    const trigger = screen.getByTestId("trigger");
    trigger.focus();
    expect(trigger).toHaveFocus();

    rerender(
      <>
        <button data-testid="trigger">Open</button>
        <ConfirmationDialog
          open={true}
          title="Test"
          description="Desc"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </>,
    );

    // Dialog is open, focus should be on cancel.
    expect(screen.getByTestId("confirmation-cancel")).toHaveFocus();

    // Close the dialog.
    rerender(
      <>
        <button data-testid="trigger">Open</button>
        <ConfirmationDialog
          open={false}
          title="Test"
          description="Desc"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </>,
    );

    // Focus should be restored to the trigger.
    expect(trigger).toHaveFocus();
  });

  it("does not close when the backdrop is clicked (background non-interaction)", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmationDialog
        open={true}
        title="Test"
        description="Desc"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    const backdrop = screen.getByTestId("confirmation-dialog-backdrop");
    fireEvent.click(backdrop);
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});