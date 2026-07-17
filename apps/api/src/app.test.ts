import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("createApp", () => {
  it("creates an Express application", async () => {
    const app = await createApp();

    expect(typeof app.use).toBe("function");
  });

  it("trusts exactly one proxy hop in production", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const app = await createApp();
      expect(app.get("trust proxy")).toBe(1);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
