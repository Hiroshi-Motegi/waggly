import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../../helpers/mock-supabase";

// --- Mocks ---
const mockSupabase = createMockSupabase();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

import { POST } from "@/app/api/webhook/payjp/route";

const BASE_URL = "http://localhost:3000/api/webhook/payjp";
const WEBHOOK_TOKEN = "test-webhook-token";

function createWebhookRequest(body: any, token?: string) {
  const headers: Record<string, string> = {};
  if (token !== undefined) {
    headers["x-payjp-webhook-token"] = token;
  }

  return new Request(BASE_URL, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers,
  });
}

describe("POST /api/webhook/payjp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYJP_WEBHOOK_TOKEN = WEBHOOK_TOKEN;
  });

  it("returns 401 when webhook token is missing", async () => {
    const req = createWebhookRequest({ id: "evt_1", type: "subscription.renewed" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("invalid signature");
  });

  it("returns 401 when webhook token is invalid", async () => {
    const req = createWebhookRequest(
      { id: "evt_1", type: "subscription.renewed" },
      "wrong-token"
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("invalid signature");
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request(BASE_URL, {
      method: "POST",
      body: "not json {{{",
      headers: { "x-payjp-webhook-token": WEBHOOK_TOKEN },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid body");
  });

  it("returns 400 when event data has no id", async () => {
    const req = createWebhookRequest(
      { type: "subscription.renewed" },
      WEBHOOK_TOKEN
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid event");
  });

  it("returns 400 when event data has no type", async () => {
    const req = createWebhookRequest(
      { id: "evt_1" },
      WEBHOOK_TOKEN
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid event");
  });

  it("returns 200 for duplicate event (idempotency)", async () => {
    // First call: webhook_events query finds the event already exists
    mockSupabase.queueResult("webhook_events", {
      data: { id: "evt_duplicate" },
      error: null,
    });

    const req = createWebhookRequest(
      {
        id: "evt_duplicate",
        type: "subscription.renewed",
        data: { id: "sub_123" },
      },
      WEBHOOK_TOKEN
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it("processes new event and returns 200", async () => {
    // webhook_events query returns null (not found -> new event)
    mockSupabase.queueResult("webhook_events", {
      data: null,
      error: null,
    });
    // webhook_events insert
    mockSupabase.queueResult("webhook_events", {
      data: null,
      error: null,
    });
    // subscriptions update for subscription.renewed
    mockSupabase.queueResult("subscriptions", {
      data: null,
      error: null,
    });

    const req = createWebhookRequest(
      {
        id: "evt_new",
        type: "subscription.renewed",
        data: {
          id: "sub_123",
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        },
      },
      WEBHOOK_TOKEN
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });
});
