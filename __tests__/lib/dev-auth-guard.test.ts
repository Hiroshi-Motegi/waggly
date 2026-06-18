import { describe, it, expect } from "vitest";
import fs from "fs";

describe("DEV_SKIP_AUTH guard", () => {
  it("middleware.ts must check NODE_ENV before using DEV_SKIP_AUTH", () => {
    const middleware = fs.readFileSync("src/middleware.ts", "utf-8");
    expect(middleware).toContain('process.env.NODE_ENV === "development"');
    // DEV_SKIP_AUTH must not appear outside a NODE_ENV guard
    expect(middleware).toContain('process.env.NODE_ENV !== "development"');
  });

  it("auth-provider.tsx must check NODE_ENV before using DEV_SKIP_AUTH", () => {
    const auth = fs.readFileSync("src/components/auth-provider.tsx", "utf-8");
    expect(auth).toContain('process.env.NODE_ENV === "development"');
  });
});
