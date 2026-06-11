import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/debug/merge
 * One-time fix: move google_id from Account 1 to Account 2, delete Account 1.
 * Dev only.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "dev only" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find the two accounts
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .not("line_user_id", "like", "dev-%")
    .order("created_at", { ascending: true });

  if (!users || users.length < 2) {
    return NextResponse.json({ error: "Expected 2 accounts", count: users?.length });
  }

  const keepAccount = users[0]; // Older account (has data)
  const deleteAccount = users[1]; // Newer account (has google_id)

  console.log("[merge] Keep:", keepAccount.id, keepAccount.display_name);
  console.log("[merge] Delete:", deleteAccount.id, deleteAccount.display_name);

  if (!deleteAccount.google_id) {
    return NextResponse.json({ error: "Delete account has no google_id to transfer" });
  }

  // 1. Transfer google_id to the keep account
  const { error: updateError } = await supabase
    .from("users")
    .update({ google_id: deleteAccount.google_id })
    .eq("id", keepAccount.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to transfer google_id", detail: updateError.message });
  }

  // 2. Delete the newer account's data
  await supabase.from("favorite_courses").delete().eq("user_id", deleteAccount.id);
  await supabase.from("profiles").delete().eq("id", deleteAccount.id);
  await supabase.from("practice_sessions").delete().eq("user_id", deleteAccount.id);
  await supabase.from("accessories").delete().eq("user_id", deleteAccount.id);
  await supabase.from("clubs").delete().eq("user_id", deleteAccount.id);
  await supabase.from("users").delete().eq("id", deleteAccount.id);

  // 3. Delete the newer account's auth user
  await supabase.auth.admin.deleteUser(deleteAccount.id);

  // 4. Verify
  const { data: remaining } = await supabase
    .from("users")
    .select("id, display_name, line_user_id, google_id")
    .not("line_user_id", "like", "dev-%");

  return NextResponse.json({
    success: true,
    message: `Merged: google_id transferred from ${deleteAccount.display_name} to ${keepAccount.display_name}`,
    remaining,
  });
}
