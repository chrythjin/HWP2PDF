import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { config } from "../config.js";
import { updateJob } from "./job-store.js";

export interface ConversionInput {
  jobId: string;
  sourcePath: string;
}

export async function convertJobToPdf(input: ConversionInput) {
  updateJob(input.jobId, {
    status: "processing",
    progress: 70,
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

    updateJob(input.jobId, {
      status: "completed",
      progress: 100,
      resultPath,
      downloadUrl: `${config.resultUrlBase}/${input.jobId}.pdf`,
      message: "변환이 완료되었습니다.",
    });
  } catch (error) {
    updateJob(input.jobId, {
      status: "failed",
      progress: 0,
      message: error instanceof Error ? error.message : "변환에 실패했습니다.",
    });
  } finally {
    await fs.rm(input.sourcePath, { force: true });
  }
}

async function runLibreOffice(sourcePath: string, outputDirectory: string) {
  await new Promise<void>((resolve, reject) => {
    const process = spawn(config.converterCommand, [
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      outputDirectory,
      sourcePath,
    ]);

    let stderr = "";

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

      reject(new Error(stderr.trim() || `LibreOffice 변환이 종료 코드 ${code}로 실패했습니다.`));
    });
  });
}
