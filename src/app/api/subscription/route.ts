import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { getActiveSubscription } from "@/lib/subscription";
import { withErrorHandler } from "@/lib/api-error";

export const GET = withErrorHandler(async () => {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { userId } = auth;

  const { subscription, plan } = await getActiveSubscription(userId);

  return NextResponse.json({ subscription, plan });
});
