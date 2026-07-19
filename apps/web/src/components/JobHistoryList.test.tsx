import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobStatusResponse } from "@hwp2pdf/shared";
import JobHistoryList from "./JobHistoryList";

// ---------------------------------------------------------------------------
// JobHistoryList — T1/T2 downloadAvailable discriminated contract tests.
//
// The component must NEVER enable a download from status === "completed" alone.
// It must use the server-computed downloadAvailable field:
//   - downloadAvailable === true  -> download button enabled
//   - downloadAvailable === false -> reason label shown (expired/deleted/etc.)
//   - legacy (undefined)          -> safe fallback: only enable if downloadUrl
//                                    is present AND status is completed AND
//                                    downloadExpiresAt is in the future.
// ---------------------------------------------------------------------------

const baseJob = {
  jobId: "job-test",
  createdAt: "2026-06-20T10:00:00.000Z",
};

function makeJob(overrides: Partial<JobStatusResponse>): JobStatusResponse {
  return { ...baseJob, ...overrides } as JobStatusResponse;
}

const noopOnDelete = vi.fn();
const noopOnDownload = vi.fn();

describe("JobHistoryList download availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ---- downloadAvailable: true -> download button enabled ----
  it("enables download button when downloadAvailable is true", () => {
    const job = makeJob({
      status: "completed",
      downloadAvailable: true,
      downloadUrl: "http://localhost:8080/v1/jobs/job-test/download",
    });

    render(
      <JobHistoryList
        jobs={[job]}
        onDelete={noopOnDelete}
        deletingJobId={null}
        onDownload={noopOnDownload}
        downloadingJobId={null}
        downloadError={null}
      />,
    );

    expect(screen.getByTestId("download-button-job-test")).toBeInTheDocument();
    expect(screen.queryByTestId("download-unavailable-label-job-test")).not.toBeInTheDocument();
  });

  // ---- downloadAvailable: false with reason "expired" -> expired label ----
  it("shows expired label when downloadAvailable is false with reason expired", () => {
    const job = makeJob({
      status: "completed",
      downloadAvailable: false,
      downloadUnavailableReason: "expired",
    });

    render(
      <JobHistoryList
        jobs={[job]}
        onDelete={noopOnDelete}
        deletingJobId={null}
        onDownload={noopOnDownload}
        downloadingJobId={null}
        downloadError={null}
      />,
    );

    expect(screen.queryByTestId("download-button-job-test")).not.toBeInTheDocument();
    const label = screen.getByTestId("download-unavailable-label-job-test");
    expect(label).toBeInTheDocument();
    expect(label.textContent).toContain("만료");
  });

  // ---- downloadAvailable: false with reason "deleted" -> deleted label ----
  it("shows deleted label when downloadAvailable is false with reason deleted", () => {
    const job = makeJob({
      status: "completed",
      downloadAvailable: false,
      downloadUnavailableReason: "deleted",
    });

    render(
      <JobHistoryList
        jobs={[job]}
        onDelete={noopOnDelete}
        deletingJobId={null}
        onDownload={noopOnDownload}
        downloadingJobId={null}
        downloadError={null}
      />,
    );

    expect(screen.queryByTestId("download-button-job-test")).not.toBeInTheDocument();
    const label = screen.getByTestId("download-unavailable-label-job-test");
    expect(label.textContent).toContain("삭제");
  });

  // ---- downloadAvailable: false with reason "result_unavailable" ----
  it("shows result unavailable label when downloadAvailable is false with reason result_unavailable", () => {
    const job = makeJob({
      status: "completed",
      downloadAvailable: false,
      downloadUnavailableReason: "result_unavailable",
    });

    render(
      <JobHistoryList
        jobs={[job]}
        onDelete={noopOnDelete}
        deletingJobId={null}
        onDownload={noopOnDownload}
        downloadingJobId={null}
        downloadError={null}
      />,
    );

    expect(screen.queryByTestId("download-button-job-test")).not.toBeInTheDocument();
    const label = screen.getByTestId("download-unavailable-label-job-test");
    expect(label).toBeInTheDocument();
  });

  // ---- downloadAvailable: false with reason "access_denied" ----
  it("shows access denied label when downloadAvailable is false with reason access_denied", () => {
    const job = makeJob({
      status: "completed",
      downloadAvailable: false,
      downloadUnavailableReason: "access_denied",
    });

    render(
      <JobHistoryList
        jobs={[job]}
        onDelete={noopOnDelete}
        deletingJobId={null}
        onDownload={noopOnDownload}
        downloadingJobId={null}
        downloadError={null}
      />,
    );

    expect(screen.queryByTestId("download-button-job-test")).not.toBeInTheDocument();
    expect(screen.getByTestId("download-unavailable-label-job-test")).toBeInTheDocument();
  });

  // ---- CRITICAL: completed alone must NOT enable download ----
  it("does NOT enable download from status completed alone when downloadAvailable is false", () => {
    const job = makeJob({
      status: "completed",
      downloadAvailable: false,
      downloadUnavailableReason: "expired",
      // Even with a downloadUrl present, must not enable
      downloadUrl: "http://localhost:8080/v1/jobs/job-test/download",
    });

    render(
      <JobHistoryList
        jobs={[job]}
        onDelete={noopOnDelete}
        deletingJobId={null}
        onDownload={noopOnDownload}
        downloadingJobId={null}
        downloadError={null}
      />,
    );

    expect(screen.queryByTestId("download-button-job-test")).not.toBeInTheDocument();
    expect(screen.getByTestId("download-unavailable-label-job-test")).toBeInTheDocument();
  });

  // ---- Legacy: downloadAvailable undefined, downloadUrl + future expiry -> button ----
  it("legacy record with downloadUrl and future downloadExpiresAt enables download", () => {
    const job = makeJob({
      status: "completed",
      // downloadAvailable is undefined (legacy)
      downloadUrl: "http://localhost:8080/v1/jobs/job-test/download",
      downloadExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    render(
      <JobHistoryList
        jobs={[job]}
        onDelete={noopOnDelete}
        deletingJobId={null}
        onDownload={noopOnDownload}
        downloadingJobId={null}
        downloadError={null}
      />,
    );

    expect(screen.getByTestId("download-button-job-test")).toBeInTheDocument();
  });

  // ---- Legacy: downloadAvailable undefined, past expiry -> expired label ----
  it("legacy record with past downloadExpiresAt shows expired label", () => {
    const job = makeJob({
      status: "completed",
      downloadUrl: "http://localhost:8080/v1/jobs/job-test/download",
      downloadExpiresAt: "2020-01-01T00:00:00.000Z",
    });

    render(
      <JobHistoryList
        jobs={[job]}
        onDelete={noopOnDelete}
        deletingJobId={null}
        onDownload={noopOnDownload}
        downloadingJobId={null}
        downloadError={null}
      />,
    );

    expect(screen.queryByTestId("download-button-job-test")).not.toBeInTheDocument();
    expect(screen.getByTestId("download-unavailable-label-job-test")).toBeInTheDocument();
  });

  // ---- Legacy: downloadAvailable undefined, no downloadUrl -> no button ----
  it("legacy record without downloadUrl does not enable download", () => {
    const job = makeJob({
      status: "completed",
      // No downloadUrl, no downloadAvailable
    });

    render(
      <JobHistoryList
        jobs={[job]}
        onDelete={noopOnDelete}
        deletingJobId={null}
        onDownload={noopOnDownload}
        downloadingJobId={null}
        downloadError={null}
      />,
    );

    expect(screen.queryByTestId("download-button-job-test")).not.toBeInTheDocument();
    expect(screen.getByTestId("download-unavailable-label-job-test")).toBeInTheDocument();
  });

  // ---- Non-completed status (failed) -> no download button ----
  it("failed job does not show download button", () => {
    const job = makeJob({
      status: "failed",
      downloadAvailable: false,
      downloadUnavailableReason: "failed",
    });

    render(
      <JobHistoryList
        jobs={[job]}
        onDelete={noopOnDelete}
        deletingJobId={null}
        onDownload={noopOnDownload}
        downloadingJobId={null}
        downloadError={null}
      />,
    );

    expect(screen.queryByTestId("download-button-job-test")).not.toBeInTheDocument();
    expect(screen.getByTestId("download-unavailable-label-job-test")).toBeInTheDocument();
  });

  // ---- Empty list shows empty state ----
  it("shows empty state when jobs array is empty", () => {
    render(
      <JobHistoryList
        jobs={[]}
        onDelete={noopOnDelete}
        deletingJobId={null}
        onDownload={noopOnDownload}
        downloadingJobId={null}
        downloadError={null}
      />,
    );

    expect(screen.getByTestId("history-empty")).toBeInTheDocument();
  });

  // ---- Download click calls onDownload ----
  it("calls onDownload when download button is clicked", () => {
    const onDownload = vi.fn();
    const job = makeJob({
      status: "completed",
      downloadAvailable: true,
      downloadUrl: "http://localhost:8080/v1/jobs/job-test/download",
    });

    render(
      <JobHistoryList
        jobs={[job]}
        onDelete={noopOnDelete}
        deletingJobId={null}
        onDownload={onDownload}
        downloadingJobId={null}
        downloadError={null}
      />,
    );

    fireEvent.click(screen.getByTestId("download-button-job-test"));
    expect(onDownload).toHaveBeenCalledWith(job);
  });
});