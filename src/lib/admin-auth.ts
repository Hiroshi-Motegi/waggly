import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getApiAuth } from "@/lib/supabase/api";

interface AdminAuth {
  supabase: SupabaseClient;
  userId: string;
}

/**
 * Admin API route guard.
 * Returns { supabase, userId } if the caller is an authenticated admin,
 * or a NextResponse error otherwise.
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

  return { supabase, userId };
}

/** Type guard: true when requireAdmin() returned an error response */
export function isErrorResponse(
  result: AdminAuth | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
