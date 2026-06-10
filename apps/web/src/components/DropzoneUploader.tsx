"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { validateFile, ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from "@hwp2pdf/shared";

type UploaderStatus = "idle" | "uploading" | "processing" | "completed" | "failed";

export default function DropzoneUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploaderStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Clean up states when resetting
  const handleReset = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setErrorMessage(null);
    setDownloadUrl(null);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const selectedFile = acceptedFiles[0];
    
    // Validate file using the shared package utility
    const validation = validateFile({
      name: selectedFile.name,
      size: selectedFile.size,
    });

    if (!validation.valid) {
      setErrorMessage(validation.error || "올바르지 않은 파일입니다.");
      setStatus("failed");
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);
    startMockProcess(selectedFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/x-hwp": [".hwp"],
      "application/octet-stream": [".hwp"],
    },
    maxFiles: 1,
    disabled: status !== "idle",
  });

  // Mock upload and conversion process
  const startMockProcess = (selectedFile: File) => {
    setStatus("uploading");
    setProgress(0);

    // Simulate file upload (0% -> 100% in 1.5s)
    let uploadProgress = 0;
    const uploadInterval = setInterval(() => {
      uploadProgress += 10;
      setProgress(uploadProgress);
      if (uploadProgress >= 100) {
        clearInterval(uploadInterval);
        
        // Move to processing state
        setStatus("processing");
        setProgress(0);
        
        // Simulate remote conversion (0% -> 100% in 3.5s)
        let conversionProgress = 0;
        const conversionInterval = setInterval(() => {
          conversionProgress += 5;
          setProgress(conversionProgress);
          if (conversionProgress >= 100) {
            clearInterval(conversionInterval);
            
            // Complete process
            setStatus("completed");
            setDownloadUrl("#mock-download-url");
          }
        }, 150);
      }
    }, 150);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {status === "idle" && (
        <div
          {...getRootProps()}
          className={`relative overflow-hidden rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300 cursor-pointer
            ${
              isDragActive
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01] shadow-lg shadow-blue-500/10"
                : "border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md"
            }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Upload Icon */}
            <div className={`p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 transition-all duration-300 ${isDragActive ? "scale-110 border-blue-200 dark:border-blue-800" : ""}`}>
              <svg
                className={`w-10 h-10 transition-colors duration-300 ${isDragActive ? "text-blue-500" : "text-zinc-400 dark:text-zinc-600"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
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
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900">.hwp 만 지원</span>
              <span>•</span>
              <span>최대 {MAX_FILE_SIZE / 1024 / 1024}MB</span>
            </div>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {status === "uploading" && (
        <div className="p-8 rounded-3xl bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md shadow-xl">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-xl">
              <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{file?.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">파일 업로드 중...</p>
            </div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{progress}%</span>
          </div>
          
          <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Processing State */}
      {status === "processing" && (
        <div className="p-8 rounded-3xl bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md shadow-xl">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-xl relative">
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 3v5h-5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{file?.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">PDF로 변환 중 (이 작업은 최대 1분이 소요될 수 있습니다)</p>
            </div>
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{progress}%</span>
          </div>
          
          <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed State */}
      {status === "completed" && (
        <div className="p-8 rounded-3xl bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md shadow-xl text-center space-y-6">
          <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full shadow-inner shadow-emerald-500/10">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">변환 완료!</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">PDF 파일이 준비되었습니다.</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 font-mono mt-1 truncate max-w-sm mx-auto">{file?.name.replace(/\.hwp$/i, ".pdf")}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              href={downloadUrl || "#"}
              download
              className="flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>PDF 다운로드</span>
            </a>
            
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-medium"
            >
              다른 파일 변환
            </button>
          </div>

          <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
            * 변환된 파일은 개인정보 보호를 위해 30분 후 완전히 자동 삭제됩니다.
          </p>
        </div>
      )}

      {/* Failed State */}
      {status === "failed" && (
        <div className="p-8 rounded-3xl bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md shadow-xl text-center space-y-6">
          <div className="inline-flex p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">변환에 실패했습니다</h3>
            <p className="text-sm text-rose-500 font-medium">{errorMessage || "알 수 없는 오류가 발생했습니다."}</p>
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
