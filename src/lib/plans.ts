export const PLAN_ID = {
  FREE: "free",
  PRO: "pro",
} as const;
export type PlanId = (typeof PLAN_ID)[keyof typeof PLAN_ID];

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  billing_interval: "month" | "year";
  ai_chat_monthly_limit: number;
  ai_plan_monthly_limit: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: PlanId;
  plan?: Plan;
  status: "active" | "canceled" | "expired";
  payjp_subscription_id: string | null;
  payjp_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  grace_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  free_months: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
}

export const FREE_PLAN: Plan = {
  id: PLAN_ID.FREE,
  name: "無料",
  price: 0,
  billing_interval: "month",
  ai_chat_monthly_limit: 5,
  ai_plan_monthly_limit: 3,
};

/** JST の YYYY-MM 文字列を返す（ICU非依存） */
export function getMonthJST(): string {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
