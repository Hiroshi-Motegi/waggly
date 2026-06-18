import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("favorite_clubs")
    .select("*, catalog_models(id, name, category, slug, maker, maker_slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return supabaseError(error);
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

  if (error) return supabaseError(error);
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

  if (error) return supabaseError(error);
  return NextResponse.json({ ok: true });
}
