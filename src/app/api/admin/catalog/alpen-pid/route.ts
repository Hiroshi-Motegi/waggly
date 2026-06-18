import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { supabaseError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const url = new URL(request.url);
  const makerSlug = url.searchParams.get("maker_slug");
  const category = url.searchParams.get("category");
  const pidStatus = url.searchParams.get("pid_status");

  let query = supabase
    .from("catalog_models")
    .select("id, name, maker, maker_slug, slug, category, alpen_pid, image_url")
    .order("maker")
    .order("name");

  if (makerSlug) query = query.eq("maker_slug", makerSlug);
  if (category) query = query.eq("category", category);
  if (pidStatus === "has") query = query.not("alpen_pid", "is", null);
  if (pidStatus === "missing") query = query.is("alpen_pid", null);

  const { data, error } = await query.limit(200);
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const { model_id, alpen_pid } = await request.json();
  if (!model_id) return NextResponse.json({ error: "model_id required" }, { status: 400 });

  const { error } = await supabase
    .from("catalog_models")
    .update({ alpen_pid: alpen_pid || null })
    .eq("id", model_id);

  if (error) return supabaseError(error);
  return NextResponse.json({ ok: true });
}
