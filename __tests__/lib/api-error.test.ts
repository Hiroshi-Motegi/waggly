import { describe, it, expect, vi } from "vitest";
import {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  internalError,
  supabaseError,
  withErrorHandler,
} from "@/lib/api-error";

describe("api-error helpers", () => {
  it("badRequest returns 400 with message", async () => {
    const res = badRequest("invalid input");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid input");
  });

  it("unauthorized returns 401", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
  });

  it("forbidden returns 403", async () => {
    const res = forbidden();
    expect(res.status).toBe(403);
  });

  it("notFound returns 404 with resource name", async () => {
    const res = notFound("Club");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Club not found");
  });

  it("conflict returns 409", async () => {
    const res = conflict("already exists");
    expect(res.status).toBe(409);
  });

  it("tooManyRequests returns 429", async () => {
    const res = tooManyRequests();
    expect(res.status).toBe(429);
  });

  it("internalError hides details in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = internalError(new Error("secret db error"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
    expect(body.error).not.toContain("secret");

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("internalError shows details in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = internalError(new Error("db connection failed"));
    const body = await res.json();
    expect(body.error).toBe("db connection failed");

    consoleSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("supabaseError returns 500", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = supabaseError({ message: "constraint violation" });
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

describe("withErrorHandler", () => {
  it("passes through successful responses", async () => {
    const handler = withErrorHandler(async () => {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const res = await handler();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("catches thrown errors and returns 500", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withErrorHandler(async () => {
      throw new Error("unexpected failure");
    });
    const res = await handler();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    consoleSpy.mockRestore();
  });

  it("forwards arguments to the handler", async () => {
    const handler = withErrorHandler(async (req: Request) => {
      const url = new URL(req.url);
      return new Response(JSON.stringify({ path: url.pathname }), { status: 200 });
    });
    const res = await handler(new Request("http://localhost/api/test"));
    const body = await res.json();
    expect(body.path).toBe("/api/test");
  });
});
