import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function PATCH(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  const { data: owned } = await supabase
    .from("profile_cover_images")
    .select("id")
    .eq("user_id", userId)
    .in("id", ids);

  if (!owned || owned.length !== ids.length) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  for (let i = 0; i < ids.length; i++) {
    await supabase
      .from("profile_cover_images")
      .update({ sort_order: i })
      .eq("id", ids[i])
      .eq("user_id", userId);
  }

  return NextResponse.json({ success: true });
}
