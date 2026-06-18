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

  // Find user_ids that have a "dev" provider (these are the dev users to keep)
  const { data: devProviders } = await supabase
    .from("user_providers")
    .select("user_id")
    .eq("provider", "dev");

  const devUserIds = new Set((devProviders ?? []).map((p: { user_id: string }) => p.user_id));

  const { data: users } = await supabase
    .from("users")
    .select("id, display_name");

  const nonDevUsers = (users ?? []).filter((u: { id: string }) => !devUserIds.has(u.id));

  if (!nonDevUsers.length) {
    return NextResponse.json({ message: "No users to delete" });
  }

  for (const u of nonDevUsers) {
    // Get auth_user_ids for this user before deleting
    const { data: userProviders } = await supabase
      .from("user_providers")
      .select("auth_user_id")
      .eq("user_id", u.id);

    // Delete user data (CASCADE handles most, but explicit for clarity)
    await supabase.from("favorite_courses").delete().eq("user_id", u.id);
    await supabase.from("profiles").delete().eq("id", u.id);
    await supabase.from("practice_sessions").delete().eq("user_id", u.id);
    await supabase.from("accessories").delete().eq("user_id", u.id);
    await supabase.from("clubs").delete().eq("user_id", u.id);
    await supabase.from("users").delete().eq("id", u.id);

    // Delete auth users
    for (const p of userProviders ?? []) {
      if (p.auth_user_id) {
        await supabase.auth.admin.deleteUser(p.auth_user_id);
      }
    }

    console.log("[reset] Deleted:", u.id, u.display_name);
  }

  return NextResponse.json({ deleted: nonDevUsers.length, users: nonDevUsers.map((u: { display_name: string }) => u.display_name) });
}
