/**
 * Billing configuration and helpers.
 * Stripe integration will be added here later.
 */

export interface Plan {
  id: string;
  name: string;
  price: number;
  ai_monthly_tokens: number;
  is_default: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  plan?: Plan;
  coupon_id: string | null;
  status: "active" | "canceled" | "expired";
  free_until: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
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

/**
 * Check if subscription is in free trial period
 */
export function isFreePeriod(sub: Subscription): boolean {
  if (!sub.free_until) return false;
  return new Date() < new Date(sub.free_until);
}

/**
 * Calculate actual price after coupon discount
 */
export function getEffectivePrice(plan: Plan, coupon?: Coupon | null): number {
  if (!coupon) return plan.price;
  return Math.round(plan.price * (1 - coupon.discount_percent / 100));
}
