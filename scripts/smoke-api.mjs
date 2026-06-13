const apiBaseUrl = process.env.API_BASE_URL;

if (!apiBaseUrl) {
  console.error("API_BASE_URL is required");
  process.exit(1);
}

const baseUrl = apiBaseUrl.replace(/\/$/, "");

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { text };
  }
}

async function expectStatus(label, response, expectedStatus) {
  const body = await readJson(response);
  if (response.status !== expectedStatus) {
    console.error(`${label} expected ${expectedStatus}, got ${response.status}`);
    console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }
  console.log(`${label}: ${response.status}`);
  return body;
}

const health = await fetch(`${baseUrl}/health`);
const healthBody = await expectStatus("health", health, 200);
if (healthBody.status !== "ok") {
  console.error("health response did not contain status=ok");
  process.exit(1);
}

const invalidUpload = await fetch(`${baseUrl}/v1/upload`, {
  method: "POST",
});
await expectStatus("invalid multipart upload", invalidUpload, 422);

const directUploadInit = await fetch(`${baseUrl}/v1/uploads/initiate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fileName: "smoke.hwp",
    fileSize: 16,
  }),
});

const directUploadBody = await expectStatus("direct upload init", directUploadInit, 201);
for (const key of ["jobId", "uploadUrl", "objectPath", "headers", "expiresAt"]) {
  if (!directUploadBody[key]) {
    console.error(`direct upload init response missing ${key}`);
    process.exit(1);
  }
}

console.log("api smoke passed");
