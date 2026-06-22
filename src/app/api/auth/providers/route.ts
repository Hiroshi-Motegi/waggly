import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { getSupabaseAdmin } from "@/lib/auth-helpers";
import { withErrorHandler } from "@/lib/api-error";

export const GET = withErrorHandler(async () => {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();

  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from("user_providers")
    .select("provider, auth_user_id")
    .eq("user_id", auth.userId);

  // 現在のセッションの auth_user_id を取得
  let currentAuthUserId: string | null = null;
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    currentAuthUserId = user?.id ?? null;
  } else {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    currentAuthUserId = user?.id ?? null;
  }

  const result = (data ?? []).map((p: { provider: string; auth_user_id: string | null }) => ({
    provider: p.provider,
    is_current: p.auth_user_id === currentAuthUserId,
  }));

  return NextResponse.json(result);
});
