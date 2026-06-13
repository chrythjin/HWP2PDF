import fs from "node:fs/promises";
import { Storage } from "@google-cloud/storage";
import { config } from "../config.js";

const hwpContentType = "application/octet-stream";
const pdfContentType = "application/pdf";

type UploadKind = "original" | "result";

let storageClient: Storage | undefined;

function shouldUseGcs() {
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

function createObjectPath(kind: UploadKind, jobId: string, fileName: string) {
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
