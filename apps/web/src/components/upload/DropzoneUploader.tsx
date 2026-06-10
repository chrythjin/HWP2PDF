"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadResponse, UploadStatus } from "@hwp2pdf/shared";
import { validateFile } from "@hwp2pdf/shared";
import { API_ROUTES, POLLING_INTERVAL } from "@hwp2pdf/shared";



interface FileWithPreview extends File {
  preview?: string;
}

export default function DropzoneUploader() {
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: ReadonlyArray<{ file: File; errors: ReadonlyArray<{ code: string; message: string }> }>) => {
    setErrorMessage("");
    setDownloadUrl(null);
    setJobId(null);
    setProgress(0);
    setStatus("idle");

    if (rejectedFiles.length > 0) {
      const errorReasons = rejectedFiles
        .flatMap((r) => r.errors)
        .map((e) => e.message)
        .join(", ");
      setErrorMessage(`파일 업로드 거부: ${errorReasons}`);
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "파일이 유효하지 않습니다.");
      return;
    }

    // Create preview for display
    const fileWithPreview = Object.assign(file, {
      preview: URL.createObjectURL(file),
    }) as FileWithPreview;

    setSelectedFile(fileWithPreview);
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    open,
  } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    accept: {
      "application/x-hwp": [".hwp"],
      "application/hwp": [".hwp"],
      "application/octet-stream": [".hwp"],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  const dropzoneClassName = useMemo(() => {
    const base =
      "w-full max-w-2xl rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer min-h-[300px] flex flex-col items-center justify-center";
    if (isDragReject) {
      return `${base} border-red-400 bg-red-50`;
    }
    if (isDragActive) {
      return `${base} border-blue-500 bg-blue-50 shadow-md`;
    }
    return `${base} border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50`;
  }, [isDragActive, isDragReject]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setStatus("uploading");
      setProgress(10);
      setErrorMessage("");

      const formData = new FormData();
      formData.append("file", selectedFile);

      const xhr = new XMLHttpRequest();
      const uploadUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}${API_ROUTES.UPLOAD}`;

      xhr.open("POST", uploadUrl);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 50);
          setProgress(Math.max(10, percent));
        }
      };

      xhr.onreadystatechange = async () => {
        if (xhr.readyState !== 4) return;

        if (xhr.status >= 200 && xhr.status < 300) {
          const response: UploadResponse = JSON.parse(xhr.responseText);
          setJobId(response.jobId);
          setStatus(response.status ?? "queued");
          setProgress(60);

          // Start polling for job status
          pollJobStatus(response.jobId);
        } else {
          setStatus("failed");
          setProgress(0);
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            setErrorMessage(errorResponse.message || "업로드에 실패했습니다.");
          } catch {
            setErrorMessage(`업로드에 실패했습니다. (${xhr.status})`);
          }
        }
      };

      xhr.send(formData);
    } catch (error) {
      setStatus("failed");
      setProgress(0);
      setErrorMessage("예상치 못한 오류가 발생했습니다.");
    }
  };

  const pollJobStatus = async (currentJobId: string) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
        const statusUrl = `${apiBaseUrl}${API_ROUTES.JOBS}/${currentJobId}`;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(statusUrl, { cache: "no-store" });

        if (!res.ok) {
          throw new Error("상태 조회 실패");
        }

        const data = await res.json();

        if (data.status === "queued") {
          setStatus("queued");
          setProgress(70);
        }

        if (data.status === "processing") {
          setStatus("processing");
          setProgress(85);
        }

        if (data.status === "completed") {
          setStatus("completed");
          setProgress(100);
          setDownloadUrl(data.downloadUrl ?? null);
          clearInterval(interval);
        }

        if (data.status === "failed") {
          setStatus("failed");
          setErrorMessage(data.message ?? "변환에 실패했습니다.");
          clearInterval(interval);
        }
      } catch (error) {
        setStatus("failed");
        setErrorMessage("작업 상태를 불러오는 중 오류가 발생했습니다.");
        clearInterval(interval);
      }
    }, POLLING_INTERVAL);
  };

  const getStatusText = () => {
    switch (status) {
      case "uploading":
        return "파일 업로드 중입니다...";
      case "queued":
        return "변환 작업이 대기열에 등록되었습니다...";
      case "processing":
        return "PDF로 변환 중입니다...";
      case "completed":
        return "변환이 완료되었습니다!";
      case "failed":
        return "변환에 실패했습니다.";
      case "expired":
        return "파일이 만료되었습니다.";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Dropzone */}
      <div {...getRootProps()} className={dropzoneClassName}>
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="text-6xl">📄</div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isDragActive ? "파일을 여기에 놓으세요" : "HWP 파일을 드래그해서 업로드하세요"}
          </h2>
          <p className="text-sm text-slate-500">
            또는 아래 버튼을 눌러 파일을 선택하세요
          </p>
          <button
            type="button"
            onClick={open}
            className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
          >
            파일 선택
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          *.hwp 파일만 가능 | 최대 20MB
        </p>
      </div>

      {/* Selected File */}
      {selectedFile && (
        <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📃</div>
              <div>
                <p className="font-medium text-slate-800">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setStatus("idle");
                  setProgress(0);
                  setErrorMessage("");
                  setJobId(null);
                  setDownloadUrl(null);
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={status === "uploading" || status === "queued" || status === "processing"}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                변환 시작
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {status !== "idle" && (
        <div className="w-full max-w-2xl space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{status === "completed" ? "✅" : status === "failed" ? "❌" : "⏳"} {getStatusText()}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                status === "completed" ? "bg-emerald-500" : status === "failed" ? "bg-red-500" : "bg-blue-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="w-full max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Download Button */}
      {downloadUrl && (
        <div className="flex flex-col items-center gap-3">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-lg"
          >
            📥 PDF 다운로드
          </a>
          <p className="text-xs text-slate-400">
            다운로드 링크는 15분 동안 유효합니다
          </p>
        </div>
      )}

      {/* Job ID */}
      {jobId && (
        <p className="text-xs text-slate-400">작업 ID: {jobId}</p>
      )}
    </div>
  );
}
