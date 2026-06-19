import fs from "node:fs/promises";
import { Storage } from "@google-cloud/storage";
import { config } from "../config.js";

const hwpContentType = "application/octet-stream";
const pdfContentType = "application/pdf";
export const directUploadUrlTtlMs = 10 * 60 * 1000;

type UploadKind = "original" | "result";

let storageClient: Storage | undefined;

export function shouldUseGcs() {
  return config.storageBackend === "gcs";
}

function getBucket() {
  if (!config.gcsBucketName) {
    throw new Error("GCS 저장소를 사용하려면 GCS_BUCKET_NAME을 설정하세요.");
  }

  storageClient ??= new Storage({
    projectId: config.gcsProjectId || undefined,
  });

  return storageClient.bucket(config.gcsBucketName);
}

export function createObjectPath(kind: UploadKind, jobId: string, fileName: string) {
  const prefix = kind === "original" ? config.gcsOriginalPrefix : config.gcsResultPrefix;
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}/${jobId}/${safeFileName}`;
}

async function uploadFile(localPath: string, objectPath: string, contentType: string) {
  await getBucket().upload(localPath, {
    destination: objectPath,
    metadata: {
      contentType,
      metadata: {
        uploadedAt: new Date().toISOString(),
      },
    },
  });
}

export async function createOriginalUploadUrl(input: {
  jobId: string;
  originalFileName: string;
}) {
  if (!shouldUseGcs()) return undefined;

  const objectPath = createObjectPath("original", input.jobId, input.originalFileName);
  const [uploadUrl] = await getBucket().file(objectPath).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + directUploadUrlTtlMs,
    contentType: hwpContentType,
  });

  return {
    objectPath,
    uploadUrl,
    headers: {
      "Content-Type": hwpContentType,
    },
  };
}

export async function persistOriginalFile(input: {
  jobId: string;
  localPath: string;
  originalFileName: string;
}) {
  if (!shouldUseGcs()) return undefined;

  const objectPath = createObjectPath("original", input.jobId, input.originalFileName);
  await uploadFile(input.localPath, objectPath, hwpContentType);
  return objectPath;
}

export async function downloadOriginalFile(input: {
  objectPath: string;
  localPath: string;
}) {
  if (!shouldUseGcs()) return;

  try {
    await getBucket().file(input.objectPath).download({
      destination: input.localPath,
    });
  } catch (error) {
    throw new Error(
      `GCS에서 원본 파일을 다운로드할 수 없습니다. objectPath=${input.objectPath}. 파일이 브라우저에서 GCS로 업로드되었는지, CORS 설정이 올바른지 확인하세요.`,
      { cause: error },
    );
  }
}

export async function publishResultFile(input: {
  jobId: string;
  localPath: string;
}) {
  if (!shouldUseGcs()) {
    return {
      objectPath: undefined,
      downloadUrl: `${config.resultUrlBase}/${input.jobId}.pdf`,
    };
  }

  const objectPath = createObjectPath("result", input.jobId, `${input.jobId}.pdf`);
  const bucket = getBucket();
  await uploadFile(input.localPath, objectPath, pdfContentType);

  const [downloadUrl] = await bucket.file(objectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + config.signedDownloadUrlTtlMs,
  });

  return { objectPath, downloadUrl };
}

export async function removeLocalResultFile(localPath: string | undefined) {
  if (!localPath || shouldUseGcs()) return;

  await fs.rm(localPath, { force: true });
}
