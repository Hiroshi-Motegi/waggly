import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** POST /api/debug/reset — Delete all non-dev users. Dev only. */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "dev only" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: users } = await supabase
    .from("users")
    .select("id, display_name, line_user_id")
    .not("line_user_id", "like", "dev-%");

  if (!users?.length) {
    return NextResponse.json({ message: "No users to delete" });
  }

  for (const u of users) {
    await supabase.from("favorite_courses").delete().eq("user_id", u.id);
    await supabase.from("profiles").delete().eq("id", u.id);
    await supabase.from("practice_sessions").delete().eq("user_id", u.id);
    await supabase.from("accessories").delete().eq("user_id", u.id);
    await supabase.from("clubs").delete().eq("user_id", u.id);
    await supabase.from("users").delete().eq("id", u.id);
    await supabase.auth.admin.deleteUser(u.id);
    console.log("[reset] Deleted:", u.id, u.display_name);
  }

  return NextResponse.json({ deleted: users.length, users: users.map(u => u.display_name) });
}
