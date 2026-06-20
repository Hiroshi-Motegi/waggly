import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError, withErrorHandler } from "@/lib/api-error";

const RESERVED = [
  "admin", "settings", "api", "p", "auth", "login", "signup", "profile", "new", "edit",
  "bag", "items", "practice", "coach", "courses", "export", "subscription", "usage",
  "accessories", "maintenances", "privacy", "terms",
];
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { username } = await request.json();

  if (!username || !USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "3〜20文字の英数字・ハイフン・アンダースコアで入力してください" }, { status: 400 });
  }
  if (RESERVED.includes(username.toLowerCase())) {
    return NextResponse.json({ error: "このユーザー名は使用できません" }, { status: 400 });
  }

  // Check availability
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "このユーザー名は既に使われています" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ username, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(data);
});
