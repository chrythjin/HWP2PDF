"use client";

import { useCallback, useRef, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import {
  API_ROUTES,
  ALLOWED_EXTENSIONS,
  ANONYMOUS_ACCESS_TOKEN_HEADER,
  MAX_FILE_SIZE,
  MAX_POLLING_TIME,
  POLLING_INTERVAL,
  PROGRESS,
  type ApiErrorBody,
  type DirectUploadInitResponse,
  type DownloadUnavailableReason,
  type JobStatusResponse,
  type UploadResponse,
  type UploadStatus,
  validateFile,
} from "@hwp2pdf/shared";
import { useAuth } from "@/auth/useAuth";
import { fetchWithAuth, buildApiUrl } from "@/lib/api-client";
import { downloadProtectedFile } from "@/lib/download-file";
import {
  clearJobAccessToken,
  loadJobAccessToken,
  saveJobAccessToken,
} from "@/lib/upload-token";

function readApiError(responseText: string, fallbackMessage: string) {
  try {
    const body = JSON.parse(responseText) as ApiErrorBody;
    return body.error?.message ?? body.message ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function isActiveStatus(status: UploadStatus) {
  return status === "uploading" || status === "queued" || status === "processing";
}

/**
 * Human-readable Korean status labels used for the live-region announcement
 * and the progressbar aria-valuetext. Kept in one place so the screen-reader
 * message and the visible label never drift apart.
 */
const STATUS_LABEL: Record<UploadStatus, string> = {
  idle: "대기 중",
  uploading: "파일 업로드 중",
  queued: "변환 작업 대기 중",
  processing: "PDF로 변환 중",
  completed: "변환 완료",
  failed: "변환 실패",
  expired: "변환 만료",
  deleted: "결과 삭제됨",
};

/**
 * Extended upload response shape that includes the anonymous access token
 * fields returned exactly once by the API for anonymous users.
 */
type UploadResponseWithToken = UploadResponse & {
  accessToken?: string;
  accessTokenHeader?: string;
};

type DirectUploadInitResponseWithToken = DirectUploadInitResponse & {
  accessToken?: string;
  accessTokenHeader?: string;
};

export default function DropzoneUploader() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadErrorMessage, setDownloadErrorMessage] = useState<string | null>(null);
  const [downloadAvailable, setDownloadAvailable] = useState<boolean | undefined>(undefined);
  const [downloadUnavailableReason, setDownloadUnavailableReason] = useState<DownloadUnavailableReason | undefined>(undefined);
  const uploadSessionRef = useRef(0);

  const handleReset = useCallback(() => {
    uploadSessionRef.current += 1;
    if (jobId) {
      clearJobAccessToken(jobId);
    }
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setErrorMessage(null);
    setJobId(null);
    setIsDownloading(false);
    setDownloadErrorMessage(null);
    setDownloadAvailable(undefined);
    setDownloadUnavailableReason(undefined);
  }, [jobId]);

  // Download the converted PDF through the authenticated fetch helper so
  // Firebase bearer tokens and anonymous job tokens are sent as headers
  // and never leak into hrefs, query strings, or logs.
  const handleDownload = useCallback(async () => {
    if (!jobId || isDownloading) return;

    setIsDownloading(true);
    setDownloadErrorMessage(null);

    // For anonymous jobs, load the persisted same-job token from
    // sessionStorage. We do NOT clear it here on failure so a transient 401
    // or network blip does not lock the user out of retrying.
    const anonymousToken = user ? null : loadJobAccessToken(jobId);

    if (!user && !anonymousToken) {
      setIsDownloading(false);
      setDownloadErrorMessage("다운로드 토큰이 없습니다. 페이지를 새로고침한 경우 변환을 다시 시도해 주세요.");
      return;
    }

    const downloadUrl = `${API_ROUTES.JOBS}/${jobId}/download`;
    const filename = file?.name.replace(/\.hwp$/i, ".pdf") ?? `${jobId}.pdf`;

    try {
      await downloadProtectedFile({
        url: downloadUrl,
        user,
        anonymousJobToken: anonymousToken,
        filename,
      });
    } catch (error) {
      setDownloadErrorMessage(
        error instanceof Error ? error.message : "PDF 다운로드에 실패했습니다.",
      );
    } finally {
      setIsDownloading(false);
    }
  }, [file, isDownloading, jobId, user]);

  const pollJobStatus = useCallback(
    async (currentJobId: string, currentToken: string | null, startedAt: number, uploadSession: number) => {
      while (uploadSessionRef.current === uploadSession) {
        if (Date.now() - startedAt > MAX_POLLING_TIME) {
          setStatus("failed");
          setProgress(0);
          setErrorMessage("변환 시간이 초과되었습니다. 잠시 후 다시 시도하세요.");
          return;
        }

        try {
          const route = `${API_ROUTES.JOBS}/${currentJobId}`;
          const headers: Record<string, string> = {};

          // For anonymous jobs, attach the access token header.
          // For logged-in users, fetchWithAuth adds Authorization.
          if (!user && currentToken) {
            headers[ANONYMOUS_ACCESS_TOKEN_HEADER] = currentToken;
          }

          const response = await fetchWithAuth(route, user, {
            cache: "no-store",
            headers,
          });

          const responseText = await response.text();

          // Handle 401/403 — token missing or wrong.
          if (response.status === 401 || response.status === 403) {
            if (uploadSessionRef.current !== uploadSession) return;
            setStatus("failed");
            setProgress(0);
            setErrorMessage(
              response.status === 401
                ? "접근 토큰이 없어 작업 상태를 조회할 수 없습니다. 페이지를 새로고침한 경우 변환을 다시 시도해 주세요."
                : "접근 토큰이 올바르지 않아 작업 상태를 조회할 수 없습니다.",
            );
            return;
          }

          if (!response.ok) {
            throw new Error(readApiError(responseText, "작업 상태를 불러오지 못했습니다."));
          }

          const job = JSON.parse(responseText) as JobStatusResponse;
          if (uploadSessionRef.current !== uploadSession) return;

          setStatus(job.status);
          setProgress(job.progress ?? (job.status === "queued" ? 60 : 80));

          if (job.status === "completed") {
            setProgress(100);
            setDownloadAvailable(job.downloadAvailable);
            setDownloadUnavailableReason(job.downloadUnavailableReason);
            // Legacy records (downloadAvailable undefined) with a downloadUrl
            // are still downloadable. T1/T2 records use the server-computed
            // downloadAvailable field — never derive it from status alone.
            if (job.downloadAvailable === false) {
              setErrorMessage(null);
            } else if (job.downloadAvailable === true) {
              setErrorMessage(null);
            } else if (job.downloadUrl) {
              setErrorMessage(null);
            } else {
              setErrorMessage("다운로드 링크를 받지 못했습니다.");
            }
            return;
          }

          if (job.status === "failed" || job.status === "expired") {
            setProgress(0);
            setErrorMessage(job.message ?? "변환에 실패했습니다.");
            return;
          }
        } catch (error) {
          if (uploadSessionRef.current !== uploadSession) return;
          setStatus("failed");
          setProgress(0);
          setErrorMessage(error instanceof Error ? error.message : "작업 상태를 불러오는 중 오류가 발생했습니다.");
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, POLLING_INTERVAL));
      }
    },
    [user],
  );

  const uploadFile = useCallback(
    async (selectedFile: File) => {
      uploadSessionRef.current += 1;
      const uploadSession = uploadSessionRef.current;
      setStatus("uploading");
      setProgress(0);
      setErrorMessage(null);
      setJobId(null);

      // Store the job ID + access token from the upload response and
      // begin polling. For anonymous responses, persist the token to
      // sessionStorage so a page reload can recover it.
      const startPolling = (response: UploadResponseWithToken) => {
        setJobId(response.jobId);
        setStatus(response.status);
        setProgress(PROGRESS.QUEUED);

        if (response.accessToken) {
          saveJobAccessToken(response.jobId, response.accessToken);
        }

        void pollJobStatus(response.jobId, response.accessToken ?? null, Date.now(), uploadSession);
      };

      const uploadViaMultipart = async () => {
        const formData = new FormData();
        formData.append("file", selectedFile);

        await new Promise<void>((resolve) => {
          const request = new XMLHttpRequest();
          request.open("POST", buildApiUrl(API_ROUTES.UPLOAD));

          // Attach Firebase ID token for logged-in users.
          if (user) {
            user.getIdToken().then((token) => {
              request.setRequestHeader("Authorization", `Bearer ${token}`);
              request.send(formData);
            });
          } else {
            request.send(formData);
          }

          request.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            setProgress(Math.min(PROGRESS.UPLOAD_COMPLETE, Math.max(PROGRESS.UPLOAD_START, Math.round((event.loaded / event.total) * PROGRESS.UPLOAD_COMPLETE))));
          };

          request.onload = () => {
            if (uploadSessionRef.current !== uploadSession) {
              resolve();
              return;
            }

            if (request.status < 200 || request.status >= 300) {
              setStatus("failed");
              setProgress(0);
              setErrorMessage(readApiError(request.responseText, `업로드에 실패했습니다. (${request.status})`));
              resolve();
              return;
            }

            startPolling(JSON.parse(request.responseText) as UploadResponseWithToken);
            resolve();
          };

          request.onerror = () => {
            if (uploadSessionRef.current !== uploadSession) {
              resolve();
              return;
            }

            setStatus("failed");
            setProgress(0);
            setErrorMessage("API 서버에 연결할 수 없습니다. 서버 실행 상태와 API 주소를 확인하세요.");
            resolve();
          };
        });
      };

      const uploadToSignedUrl = async (upload: DirectUploadInitResponseWithToken) => {
        await new Promise<void>((resolve, reject) => {
          const request = new XMLHttpRequest();
          request.open("PUT", upload.uploadUrl);

          for (const [name, value] of Object.entries(upload.headers)) {
            request.setRequestHeader(name, value);
          }

          request.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            setProgress(Math.min(PROGRESS.UPLOAD_COMPLETE, Math.max(PROGRESS.UPLOAD_START, Math.round((event.loaded / event.total) * PROGRESS.UPLOAD_COMPLETE))));
          };

          request.onload = () => {
            if (request.status >= 200 && request.status < 300) {
              resolve();
              return;
            }

            reject(new Error(`GCS 업로드에 실패했습니다. (${request.status})`));
          };

          request.onerror = () => reject(new Error("GCS 업로드 URL에 연결할 수 없습니다."));
          request.send(selectedFile);
        });
      };

      try {
        const initHeaders: Record<string, string> = { "Content-Type": "application/json" };

        const initResponse = await fetchWithAuth(API_ROUTES.UPLOADS_INITIATE, user, {
          method: "POST",
          headers: initHeaders,
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
          }),
        });

        const initText = await initResponse.text();
        if (initResponse.status === 409) {
          await uploadViaMultipart();
          return;
        }

        if (!initResponse.ok) {
          throw new Error(readApiError(initText, "직접 업로드 URL을 만들지 못했습니다."));
        }

        const directUpload = JSON.parse(initText) as DirectUploadInitResponseWithToken;
        await uploadToSignedUrl(directUpload);

        // Attach the anonymous access token to the complete request if present.
        const completeHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (!user && directUpload.accessToken) {
          completeHeaders[ANONYMOUS_ACCESS_TOKEN_HEADER] = directUpload.accessToken;
        }

        const completeResponse = await fetchWithAuth(API_ROUTES.UPLOADS_COMPLETE, user, {
          method: "POST",
          headers: completeHeaders,
          body: JSON.stringify({
            jobId: directUpload.jobId,
            objectPath: directUpload.objectPath,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
          }),
        });

        const completeText = await completeResponse.text();
        if (!completeResponse.ok) {
          throw new Error(readApiError(completeText, "업로드 완료 처리를 실패했습니다."));
        }

        if (uploadSessionRef.current !== uploadSession) return;
        startPolling(JSON.parse(completeText) as UploadResponseWithToken);
      } catch (error) {
        if (uploadSessionRef.current !== uploadSession) return;
        setStatus("failed");
        setProgress(0);
        setErrorMessage(error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.");
      }
    },
    [pollJobStatus, user],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (isActiveStatus(status)) return;

      if (rejectedFiles.length > 0) {
        const message = rejectedFiles[0]?.errors[0]?.message ?? "파일을 업로드할 수 없습니다.";
        setErrorMessage(message);
        setStatus("failed");
        return;
      }

      const selectedFile = acceptedFiles[0];
      if (!selectedFile) return;

      const validation = validateFile({
        name: selectedFile.name,
        size: selectedFile.size,
      });

      if (!validation.valid) {
        setFile(selectedFile);
        setErrorMessage(validation.error ?? "올바르지 않은 파일입니다.");
        setStatus("failed");
        setProgress(0);
        return;
      }

      setFile(selectedFile);
      void uploadFile(selectedFile);
    },
    [status, uploadFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/x-hwp": [".hwp"],
      "application/octet-stream": [".hwp"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: isActiveStatus(status),
  });

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Screen-reader live region: announces status transitions without
          duplicating the visible label. aria-live=polite so it does not
          interrupt the user. role=status is the WAI-ARIA polite live region. */}
      <div role="status" aria-live="polite" className="sr-only" data-testid="upload-status-announcement">
        {status !== "idle" ? `${STATUS_LABEL[status]}${progress > 0 && progress < 100 ? ` (${progress}%)` : ""}` : ""}
      </div>

      {status === "idle" && (
        <div
          {...getRootProps({
            role: "button",
            "aria-label": "HWP 파일 선택",
          })}
          className={`relative overflow-hidden rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300 cursor-pointer
            ${
              isDragActive
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01] shadow-lg shadow-blue-500/10"
                : "border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md"
            }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 transition-all duration-300 ${isDragActive ? "scale-110 border-blue-200 dark:border-blue-800" : ""}`}>
              <svg
                className={`w-10 h-10 transition-colors duration-300 ${isDragActive ? "text-blue-500" : "text-zinc-400 dark:text-zinc-600"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              </svg>
            </div>

            <div className="space-y-1.5">
              <p className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
                {isDragActive ? "여기에 파일을 놓으세요!" : "HWP 파일을 드래그하여 놓으세요"}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">
                또는 클릭하여 파일 선택
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center space-x-2 text-xs text-zinc-400 dark:text-zinc-600">
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900">{ALLOWED_EXTENSIONS.join(", ")} 만 지원</span>
              <span>•</span>
              <span>최대 {MAX_FILE_SIZE / 1024 / 1024}MB</span>
            </div>
          </div>
        </div>
      )}

      {status === "uploading" && (
        <div className="p-8 rounded-3xl bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md shadow-xl">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-xl">
              <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{file?.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">파일 업로드 중...</p>
            </div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{progress}%</span>
          </div>

          <div
            role="progressbar"
            aria-label="파일 업로드 진행률"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-valuetext={`${progress}% 업로드됨`}
            className="w-full bg-zinc-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden"
            data-testid="upload-progressbar"
          >
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {(status === "queued" || status === "processing") && (
        <div className="p-8 rounded-3xl bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md shadow-xl">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-xl relative">
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 3v5h-5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{file?.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                {status === "queued" ? "변환 작업 대기 중..." : "PDF로 변환 중 (이 작업은 최대 1분이 소요될 수 있습니다)"}
              </p>
              {jobId && <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-600">작업 ID: {jobId}</p>}
            </div>
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{progress}%</span>
          </div>

          <div
            role="progressbar"
            aria-label={status === "queued" ? "변환 대기 진행률" : "PDF 변환 진행률"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-valuetext={`${progress}% ${status === "queued" ? "대기 중" : "변환 중"}`}
            className="w-full bg-zinc-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden"
            data-testid="conversion-progressbar"
          >
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === "completed" && (
        <div className="p-8 rounded-3xl bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md shadow-xl text-center space-y-6">
          <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full shadow-inner shadow-emerald-500/10">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">변환 완료!</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">PDF 파일이 준비되었습니다.</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 font-mono mt-1 truncate max-w-sm mx-auto">{file?.name.replace(/\.hwp$/i, ".pdf")}</p>
          </div>

          {/* T1/T2 downloadAvailable contract:
                - true  -> download button
                - false -> unavailable message (expired/deleted/etc.)
                - legacy undefined + downloadUrl -> download button (safe fallback) */}
          {downloadAvailable === false ? (
            <div className="space-y-4" data-testid="download-unavailable-message">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                {downloadUnavailableReason === "expired"
                  ? "다운로드 기간이 만료되었습니다."
                  : downloadUnavailableReason === "deleted"
                    ? "결과 파일이 삭제되었습니다."
                    : downloadUnavailableReason === "access_denied"
                      ? "다운로드 권한이 없습니다."
                      : "다운로드할 수 없는 결과입니다."}
              </p>
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-medium"
              >
                다른 파일 변환
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{isDownloading ? "다운로드 중..." : "PDF 다운로드"}</span>
                </button>

                <button
                  onClick={handleReset}
                  className="px-6 py-3 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-medium"
                >
                  다른 파일 변환
                </button>
              </div>

              {downloadErrorMessage && (
                <p className="text-sm text-rose-500 font-medium" role="alert">
                  {downloadErrorMessage}
                </p>
              )}

              <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
                * 다운로드 링크는 보안을 위해 짧은 시간 동안만 유효하며, 변환 파일은 자동 삭제됩니다.
              </p>
            </>
          )}
        </div>
      )}

      {status === "failed" && (
        <div className="p-8 rounded-3xl bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md shadow-xl text-center space-y-6">
          <div className="inline-flex p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">변환에 실패했습니다</h3>
            <p className="text-sm text-rose-500 font-medium">{errorMessage ?? "알 수 없는 오류가 발생했습니다."}</p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleReset}
              className="px-8 py-3 rounded-full bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-medium shadow-md hover:bg-zinc-700 dark:hover:bg-zinc-100 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
