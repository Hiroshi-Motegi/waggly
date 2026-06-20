import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError, withErrorHandler } from "@/lib/api-error";

export function generateStaticParams() {
  return [{ clubId: "_" }];
}

export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) => {
  const { clubId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  // Verify club ownership
  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("user_id", userId)
    .single();

  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("club_memos")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (error) return supabaseError(error);
  return NextResponse.json(data);
});

export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) => {
  const { clubId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  // Verify club ownership
  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("user_id", userId)
    .single();

  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const body = await request.json();

  // 入力バリデーション
  if (body.memo && typeof body.memo === "string" && body.memo.length > 2000) {
    return NextResponse.json({ error: "Memo too long (max 2000 chars)" }, { status: 400 });
  }
  if (body.condition && !["good", "bad", "normal"].includes(body.condition)) {
    return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
  }
  const validateTags = (tags: unknown): string[] => {
    if (!Array.isArray(tags)) return [];
    return tags.filter((t): t is string => typeof t === "string").slice(0, 20);
  };

  const { data, error } = await supabase
    .from("club_memos")
    .insert({
      club_id: clubId,
      distance: typeof body.distance === "number" ? body.distance : null,
      memo: (typeof body.memo === "string" ? body.memo.slice(0, 2000) : null) || null,
      condition: body.condition || null,
      symptom_tags: validateTags(body.symptom_tags),
      feeling_tags: validateTags(body.feeling_tags),
      gear_tags: validateTags(body.gear_tags),
    })
    .select()
    .single();

  if (error) return supabaseError(error);

  return NextResponse.json(data, { status: 201 });
});
