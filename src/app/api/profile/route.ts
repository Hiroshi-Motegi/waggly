import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError } from "@/lib/api-error";
import type { Database } from "@/types/supabase";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  // Try to get existing profile
  let { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) return supabaseError(error);

  // Create if not exists — users テーブルの表示名・アバターを初期値に
  if (!data) {
    const { data: user } = await supabase
      .from("users")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .single();

    const { data: created, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        nickname: user?.display_name ?? null,
        avatar_url: user?.avatar_url ?? null,
      })
      .select()
      .single();
    if (createError) return supabaseError(createError);
    data = created;
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const body = await request.json();
  const allowed = [
    "nickname", "golf_start_date", "average_score", "best_score",
    "home_course", "bio", "sns_links", "is_public", "visible_fields",
  ];
  type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
  const updates: ProfileUpdate = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) (updates as Record<string, unknown>)[key] = body[key];
  }

  // If turning public ON, require username
  if (updates.is_public === true) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();
    if (!profile?.username) {
      return NextResponse.json({ error: "ユーザー名を設定してください" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(data);
}
