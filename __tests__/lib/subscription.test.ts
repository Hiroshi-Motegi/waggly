import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";

// --- Mocks ---
const mockSupabase = createMockSupabase();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

import { getActiveSubscription } from "@/lib/subscription";
import { FREE_PLAN, PLAN_ID } from "@/lib/plans";

const USER_ID = "user-123";

describe("getActiveSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns FREE_PLAN when no active subscription exists", async () => {
    // select active/paused subscription (subscriptions)
    mockSupabase.queueResult("subscriptions", { data: null, error: null });

    const result = await getActiveSubscription(USER_ID);
    expect(result.subscription).toBeNull();
    expect(result.plan).toEqual(FREE_PLAN);
  });

  it("returns active subscription with plan", async () => {
    const proPlan = {
      id: PLAN_ID.PRO,
      name: "Pro",
      price: 980,
      billing_interval: "month",
      ai_chat_monthly_limit: 100,
      ai_plan_monthly_limit: 50,
    };
    const activeSub = {
      id: "sub-1",
      user_id: USER_ID,
      plan_id: PLAN_ID.PRO,
      status: "active",
      payjp_subscription_id: "payjp_sub_1",
      payjp_customer_id: "payjp_cus_1",
      current_period_start: "2026-06-01T00:00:00Z",
      current_period_end: "2026-07-01T00:00:00Z",
      trial_end: null,
      grace_period_end: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
      plan: proPlan,
    };

    // select active/paused
    mockSupabase.queueResult("subscriptions", { data: activeSub, error: null });

    const result = await getActiveSubscription(USER_ID);
    expect(result.subscription).not.toBeNull();
    expect(result.subscription!.id).toBe("sub-1");
    expect(result.subscription!.status).toBe("active");
    expect(result.plan.id).toBe(PLAN_ID.PRO);
    expect(result.plan.name).toBe("Pro");
  });

  it("returns FREE_PLAN when subscription query errors", async () => {
    // select returns error
    mockSupabase.queueResult("subscriptions", {
      data: null,
      error: { message: "query error" },
    });

    const result = await getActiveSubscription(USER_ID);
    expect(result.subscription).toBeNull();
    expect(result.plan).toEqual(FREE_PLAN);
  });

  it("returns paused subscription as active (Pro access continues)", async () => {
    const pausedSub = {
      id: "sub-2",
      user_id: USER_ID,
      plan_id: PLAN_ID.PRO,
      status: "paused",
      payjp_subscription_id: "payjp_sub_2",
      payjp_customer_id: "payjp_cus_2",
      current_period_start: "2026-06-01T00:00:00Z",
      current_period_end: "2026-07-01T00:00:00Z",
      trial_end: null,
      grace_period_end: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
      plan: {
        id: PLAN_ID.PRO,
        name: "Pro",
        price: 980,
        billing_interval: "month",
        ai_chat_monthly_limit: 100,
        ai_plan_monthly_limit: 50,
      },
    };

    mockSupabase.queueResult("subscriptions", { data: pausedSub, error: null });

    const result = await getActiveSubscription(USER_ID);
    expect(result.subscription).not.toBeNull();
    expect(result.subscription!.status).toBe("paused");
    expect(result.plan.id).toBe(PLAN_ID.PRO);
  });
});
