import { config } from "./config.js";
import { createApp } from "./app.js";
import { initializeConverterRuntime } from "./converter-readiness.js";

await initializeConverterRuntime();

const app = await createApp({ converterOnly: true });

app.listen(config.port, () => {
  console.log(`HWP2PDF converter listening on http://localhost:${config.port}`);
});
