import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

const attrSchema = z.object({
  model_id: z.string().uuid(),
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(5000),
  sort_order: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const modelId = request.nextUrl.searchParams.get("model_id");
  if (!modelId) return badRequest("model_id required");

  const { data, error } = await adminClient
    .from("catalog_model_attributes")
    .select("*")
    .eq("model_id", modelId)
    .order("sort_order");
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = attrSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { data, error } = await adminClient
    .from("catalog_model_attributes")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const schema = z.object({
    id: z.string().uuid(),
    label: z.string().min(1).max(200).optional(),
    value: z.string().min(1).max(5000).optional(),
    sort_order: z.number().int().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { id, ...updates } = parsed.data;
  const { data, error } = await adminClient
    .from("catalog_model_attributes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

const deleteAttrSchema = z.object({ id: z.string().uuid() });

export async function DELETE(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = deleteAttrSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { error } = await adminClient.from("catalog_model_attributes").delete().eq("id", parsed.data.id);
  if (error) return supabaseError(error);
  return NextResponse.json({ success: true });
}
