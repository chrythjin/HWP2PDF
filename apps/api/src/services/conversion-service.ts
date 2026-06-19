import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { PROGRESS } from "@hwp2pdf/shared";
import { config } from "../config.js";
import { updateJob } from "./job-store.js";
import { publishResultFile } from "./storage-service.js";

export interface ConversionInput {
  jobId: string;
  sourcePath: string;
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
    await updateJob(input.jobId, {
      status: "failed",
      progress: PROGRESS.FAILED,
      message: error instanceof Error ? error.message : "변환에 실패했습니다.",
    });
  } finally {
    await fs.rm(input.sourcePath, { force: true });
  }
}

async function runLibreOffice(sourcePath: string, outputDirectory: string) {
  const sourceBaseName = path.basename(sourcePath, path.extname(sourcePath));
  const profileDirectory = path.join(outputDirectory, `${sourceBaseName}-lo-profile`);

  try {
    await new Promise<void>((resolve, reject) => {
      const process = spawn(config.converterCommand, [
        "--headless",
        "--nologo",
        "--nofirststartwizard",
        "--norestore",
        `--env:UserInstallation=${pathToFileURL(profileDirectory).href}`,
        "--infilter=Hwp2002_File",
        "--convert-to",
        "pdf:writer_pdf_Export",
        "--outdir",
        outputDirectory,
        sourcePath,
      ]);

      let stderr = "";
      let stdout = "";

      process.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });

      process.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });

      process.on("error", () => {
        reject(new Error("LibreOffice 변환 엔진을 실행할 수 없습니다. LIBREOFFICE_BIN 또는 런타임 이미지를 확인하세요."));
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        const details = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n").slice(0, 2000);
        reject(new Error(details || `LibreOffice 변환이 종료 코드 ${code}로 실패했습니다.`));
      });
    });
  } finally {
    await fs.rm(profileDirectory, { force: true, recursive: true });
  }
}
