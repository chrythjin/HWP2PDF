import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("createApp", () => {
  it("creates an Express application", async () => {
    const app = await createApp();

    expect(typeof app.use).toBe("function");
  });
});
