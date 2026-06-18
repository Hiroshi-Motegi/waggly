import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getApiAuth, getAdminClient } from "@/lib/supabase/api";

interface AdminAuth {
  supabase: SupabaseClient;
  adminClient: SupabaseClient;
  userId: string;
}

/**
 * Admin API route guard.
 * Returns { supabase, adminClient, userId } if the caller is an authenticated admin,
 * or a NextResponse error otherwise.
 * supabase: user-scoped (RLS applies) — use for reads of user-owned data.
 * adminClient: service_role — use for writes to admin-only tables (knowledge_base etc.).
 */
export async function requireAdmin(): Promise<AdminAuth | NextResponse> {
  const auth = await getApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, userId } = auth;

  const { data: user } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (!user?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { supabase, adminClient: getAdminClient(), userId };
}

/** Type guard: true when requireAdmin() returned an error response */
export function isErrorResponse(
  result: AdminAuth | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
