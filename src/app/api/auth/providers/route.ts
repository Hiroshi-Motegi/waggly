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

  // 各プロバイダーの auth_user_id から auth.users のメールを取得
  const result = await Promise.all(
    (data ?? []).map(async (p: { provider: string; auth_user_id: string | null }) => {
      let email: string | null = null;
      if (p.auth_user_id) {
        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(p.auth_user_id);
        email = authUser?.email ?? authUser?.user_metadata?.email ?? null;
      }
      return {
        provider: p.provider,
        email,
        is_current: p.auth_user_id === currentAuthUserId,
      };
    })
  );

  return NextResponse.json(result);
});
