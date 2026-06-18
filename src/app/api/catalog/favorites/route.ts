import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("favorite_clubs")
    .select("*, catalog_models(id, name, category, slug, series_id, catalog_series(maker, maker_slug, name_slug))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { model_id } = await request.json();
  if (!model_id) return NextResponse.json({ error: "model_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("favorite_clubs")
    .insert({ user_id: userId, model_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { model_id } = await request.json();
  if (!model_id) return NextResponse.json({ error: "model_id required" }, { status: 400 });

  const { error } = await supabase
    .from("favorite_clubs")
    .delete()
    .eq("user_id", userId)
    .eq("model_id", model_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
