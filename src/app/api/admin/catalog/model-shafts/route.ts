import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

// GET: model の shaft_names からシャフト詳細を返す
export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const modelId = request.nextUrl.searchParams.get("model_id");
  if (!modelId) return badRequest("model_id required");

  const { data: model, error: modelErr } = await adminClient
    .from("catalog_models")
    .select("shaft_names")
    .eq("id", modelId)
    .single();
  if (modelErr) return supabaseError(modelErr);

  const names: string[] = model?.shaft_names ?? [];
  if (names.length === 0) return NextResponse.json([]);

  const { data: shafts, error: shaftsErr } = await adminClient
    .from("catalog_shafts")
    .select("*")
    .in("shaft_name", names)
    .order("sort_order");
  if (shaftsErr) return supabaseError(shaftsErr);

  return NextResponse.json(shafts ?? []);
}

const addSchema = z.object({
  model_id: z.string().uuid(),
  shaft_name: z.string().min(1),
});

// POST: shaft_names に名前を追加
export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = addSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { model_id, shaft_name } = parsed.data;

  const { data: model } = await adminClient
    .from("catalog_models")
    .select("shaft_names")
    .eq("id", model_id)
    .single();

  const current: string[] = model?.shaft_names ?? [];
  if (current.includes(shaft_name)) return badRequest("Already linked");

  const { error } = await adminClient
    .from("catalog_models")
    .update({ shaft_names: [...current, shaft_name] })
    .eq("id", model_id);
  if (error) return supabaseError(error);

  return NextResponse.json({ success: true }, { status: 201 });
}

const deleteSchema = z.object({
  model_id: z.string().uuid(),
  shaft_name: z.string().min(1),
});

// DELETE: shaft_names から名前を除去
export async function DELETE(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { model_id, shaft_name } = parsed.data;

  const { data: model } = await adminClient
    .from("catalog_models")
    .select("shaft_names")
    .eq("id", model_id)
    .single();

  const current: string[] = model?.shaft_names ?? [];
  const { error } = await adminClient
    .from("catalog_models")
    .update({ shaft_names: current.filter((n) => n !== shaft_name) })
    .eq("id", model_id);
  if (error) return supabaseError(error);

  return NextResponse.json({ success: true });
}
