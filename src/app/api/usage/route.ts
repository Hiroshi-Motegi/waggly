import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { getUsageCounts, getUserPlanLimits } from "@/lib/ai/usage-counter";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const plan = await getUserPlanLimits(userId);
  const counts = await getUsageCounts(userId);

  const chatLimit = plan.ai_chat_monthly_limit;
  const planLimit = plan.ai_plan_monthly_limit;

  return NextResponse.json({
    chat: {
      used: counts.chat,
      limit: chatLimit,
      remaining: Math.max(0, chatLimit - counts.chat),
    },
    plan: {
      used: counts.plan,
      limit: planLimit,
      remaining: Math.max(0, planLimit - counts.plan),
    },
    limitReached: counts.chat >= chatLimit || counts.plan >= planLimit,
  });
}
