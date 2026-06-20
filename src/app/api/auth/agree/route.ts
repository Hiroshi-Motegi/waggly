import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError, withErrorHandler } from "@/lib/api-error";


export const POST = withErrorHandler(async () => {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { error } = await supabase
    .from("users")
    .update({ agreed_terms_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return supabaseError(error);
  return NextResponse.json({ success: true });
});
