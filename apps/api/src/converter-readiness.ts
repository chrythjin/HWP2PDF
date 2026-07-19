import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { config } from "./config.js";

const execFileAsync = promisify(execFile);

let ready = false;

export function isConverterReady(): boolean {
  return ready;
}

export function getMissingConverterConfiguration(): readonly string[] {
  const required = [
    ["CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL", config.cloudTasksServiceAccountEmail],
    ["INTERNAL_WORKER_URL", config.internalWorkerUrl],
    ["INTERNAL_WORKER_AUDIENCE", config.internalWorkerAudience],
    ["INTERNAL_WORKER_ISSUER", config.internalWorkerIssuer],
  ] as const;

  return required.filter(([, value]) => !value).map(([name]) => name);
}

export async function initializeConverterRuntime(): Promise<void> {
  const missing = getMissingConverterConfiguration();
  if (missing.length > 0) {
    throw new Error(`Converter configuration is incomplete: ${missing.join(", ")}`);
  }

  await execFileAsync(config.converterCommand, [
    "--headless",
    "--nologo",
    "--nofirststartwizard",
    "--norestore",
    "--invisible",
    "--terminate_after_init",
  ]);
  ready = true;
}
