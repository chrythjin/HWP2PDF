// ---------------------------------------------------------------------------
// Protected browser download helper.
//
// Downloads protected API resources through fetch headers instead of anchor
// hrefs so Firebase bearer tokens and anonymous job tokens never enter URLs.
// ---------------------------------------------------------------------------

import type { User } from "firebase/auth";
import { ANONYMOUS_ACCESS_TOKEN_HEADER } from "@hwp2pdf/shared";
import { ApiClientError, fetchBlobWithAuth } from "./api-client";

export interface DownloadProtectedFileOptions {
  /** API route path (e.g. "/v1/jobs/:jobId/download") or full protected URL. */
  url: string;
  /** Firebase user for member-owned jobs, or null/undefined for anonymous jobs. */
  user?: User | null;
  /** Plain anonymous job token; sent only as X-Job-Access-Token header. */
  anonymousJobToken?: string | null;
  /** Browser download filename. */
  filename: string;
}

function getDownloadErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === "unauthorized") {
    return "인증이 필요합니다.";
  }
  if (error instanceof ApiClientError && error.code === "forbidden") {
    return "다운로드 권한이 없습니다.";
  }
  return "PDF 다운로드에 실패했습니다.";
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  try {
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  }
}

export async function downloadProtectedFile({
  url,
  user = null,
  anonymousJobToken,
  filename,
}: DownloadProtectedFileOptions): Promise<void> {
  const headers = new Headers();
  if (anonymousJobToken) {
    headers.set(ANONYMOUS_ACCESS_TOKEN_HEADER, anonymousJobToken);
  }

  let blob: Blob;
  try {
    blob = await fetchBlobWithAuth(url, user, {
      method: "GET",
      headers,
    });
  } catch (error) {
    throw new Error(getDownloadErrorMessage(error));
  }

  triggerBrowserDownload(blob, filename);
}
