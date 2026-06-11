import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "dev only" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: users } = await supabase
    .from("users")
    .select("id, display_name, line_user_id, google_id, created_at");

  // Mask sensitive IDs but show enough to identify
  const masked = (users ?? []).map((u: any) => ({
    id: u.id?.substring(0, 8) + "...",
    display_name: u.display_name,
    line_user_id: u.line_user_id
      ? (u.line_user_id.startsWith("oauth-") || u.line_user_id.startsWith("google-")
        ? u.line_user_id.substring(0, 15) + "..."
        : "U" + u.line_user_id.substring(1, 8) + "... (real LINE)")
      : null,
    google_id: u.google_id
      ? u.google_id.substring(0, 10) + "..."
      : null,
    created_at: u.created_at,
  }));

  return NextResponse.json({ users: masked, count: masked.length });
}
