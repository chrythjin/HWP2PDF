import { execFile } from "node:child_process";
import { config } from "./config.js";
import { createApp } from "./app.js";

const app = await createApp();

function checkConverterAvailability(): void {
  execFile(config.converterCommand, ["--version"], { timeout: 5000 }, (error, stdout) => {
    if (error) {
      console.warn(JSON.stringify({
        level: "warn",
        event: "converter_unavailable",
        command: config.converterCommand,
        error: error.message,
      }));
    } else {
      console.info(JSON.stringify({
        level: "info",
        event: "converter_available",
        version: stdout.trim().split("\n")[0],
      }));
    }
  });
}

app.listen(config.port, () => {
  console.log(`HWP2PDF API listening on http://localhost:${config.port}`);
  checkConverterAvailability();
});
