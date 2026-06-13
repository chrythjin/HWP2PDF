import { config } from "./config.js";
import { createApp } from "./app.js";

const app = await createApp();

app.listen(config.port, () => {
  console.log(`HWP2PDF API listening on http://localhost:${config.port}`);
});
