import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  PROGRESS,
  PUBLIC_CONVERSION_ERRORS,
  type PublicConversionErrorCode,
} from "@hwp2pdf/shared";
import { config } from "../config.js";
import { updateJob } from "./job-store.js";
import { publishResultFile } from "./storage-service.js";

const FIXED_LO_PROFILE_DIR = "/app/.lo-profile";

export interface ConversionInput {
  jobId: string;
  sourcePath: string;
}

function classifyConversionError(error: unknown): PublicConversionErrorCode {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (/enoent|not found|cannot find|실행할 수 없습니다/.test(message)) return "converter_unavailable";
  if (/timeout|timed out|etimedout|제한시간/.test(message)) return "conversion_timeout";
  if (/storage|gcs|bucket|upload/.test(message)) return "storage_failure";
  if (/invalid|corrupt|format|손상/.test(message)) return "invalid_document";
  return "conversion_failed";
}

export async function convertJobToPdf(input: ConversionInput) {
  await updateJob(input.jobId, {
    status: "processing",
    progress: PROGRESS.PROCESSING_START,
    message: "PDF 변환을 시작했습니다.",
  });

  await fs.mkdir(config.resultDirectory, { recursive: true });

  const resultPath = path.join(config.resultDirectory, `${input.jobId}.pdf`);

  try {
    await runLibreOffice(input.sourcePath, config.resultDirectory);

    const convertedPath = path.join(
      config.resultDirectory,
      `${path.basename(input.sourcePath, path.extname(input.sourcePath))}.pdf`,
    );

    if (convertedPath !== resultPath) {
      await fs.rename(convertedPath, resultPath);
    }

    const result = await publishResultFile({
      jobId: input.jobId,
      localPath: resultPath,
    });

    await updateJob(input.jobId, {
      status: "completed",
      progress: PROGRESS.COMPLETED,
      resultPath,
      resultObjectPath: result.objectPath,
      downloadUrl: result.downloadUrl,
      message: "변환이 완료되었습니다.",
    });
  } catch (error) {
    const errorCode = classifyConversionError(error);
    console.error(JSON.stringify({
      level: "error",
      event: "conversion_failed",
      jobId: input.jobId,
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { value: String(error) },
    }));
    await updateJob(input.jobId, {
      status: "failed",
      progress: PROGRESS.FAILED,
      errorCode,
      message: PUBLIC_CONVERSION_ERRORS[errorCode].message,
    });
    throw error;
  } finally {
    await fs.rm(input.sourcePath, { force: true });
  }
}

async function runLibreOffice(sourcePath: string, outputDirectory: string) {
  const profileDirectory = FIXED_LO_PROFILE_DIR;

  await new Promise<void>((resolve, reject) => {
    const process = spawn(config.converterCommand, [
      "--headless",
      "--nologo",
      "--nofirststartwizard",
      "--norestore",
      "--invisible",
      `-env:UserInstallation=file://${profileDirectory}`,
      "--infilter=Hwp2002_File",
      "--convert-to",
      "pdf:writer_pdf_Export",
      "--outdir",
      outputDirectory,
      sourcePath,
    ]);

    let stderr = "";
    let stdout = "";
    let settled = false;
    const appendOutput = (current: string, chunk: Buffer) =>
      (current + chunk.toString("utf8")).slice(-8_192);
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      try {
        process.kill("SIGKILL");
      } catch {
        // The close/error handler may have already observed process exit.
      }
      finish(() => reject(new Error(`LibreOffice 변환이 ${config.conversionTimeoutMs}ms 제한시간을 초과했습니다.`)));
    }, config.conversionTimeoutMs);
    timeout.unref();

    process.stdout.on("data", (chunk: Buffer) => {
      stdout = appendOutput(stdout, chunk);
    });

    process.stderr.on("data", (chunk: Buffer) => {
      stderr = appendOutput(stderr, chunk);
    });

    process.on("error", () => {
      finish(() => reject(new Error("LibreOffice 변환 엔진을 실행할 수 없습니다. LIBREOFFICE_BIN 또는 런타임 이미지를 확인하세요.")));
    });

    process.on("close", (code) => {
      if (code === 0) {
        finish(resolve);
        return;
      }

      const details = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n").slice(0, 2000);
      const diagMessage = details || `LibreOffice 변환이 종료 코드 ${code}로 실패했습니다.`;
      // 기존 conversion_failed 이벤트(convertJobToPdf catch)와 별도로,
      // LibreOffice 프로세스 수준의 진단 정보를 기록한다.
      console.error(JSON.stringify({
        level: "error",
        event: "libreoffice_exit_nonzero",
        exitCode: code,
        stdoutTail: stdout.trim().slice(-500),
        stderrTail: stderr.trim().slice(-500),
      }));
      finish(() => reject(new Error(diagMessage)));
    });
  });

  // profile 디렉토리는 warm-up 캐시를 재사용하기 위해 삭제하지 않음
}
