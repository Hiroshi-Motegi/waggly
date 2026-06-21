import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

const linkSchema = z.object({
  model_id: z.string().uuid(),
  label: z.string().min(1).max(100),
  url: z.string().url().max(2000),
  sort_order: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const modelId = request.nextUrl.searchParams.get("model_id");
  if (!modelId) return badRequest("model_id required");

  const { data, error } = await adminClient
    .from("catalog_model_links")
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
  const parsed = linkSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { data, error } = await adminClient
    .from("catalog_model_links")
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
    label: z.string().min(1).max(100).optional(),
    url: z.string().url().max(2000).optional(),
    sort_order: z.number().int().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { id, ...updates } = parsed.data;
  const { data, error } = await adminClient
    .from("catalog_model_links")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

const deleteLinkSchema = z.object({ id: z.string().uuid() });

export async function DELETE(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = deleteLinkSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { error } = await adminClient.from("catalog_model_links").delete().eq("id", parsed.data.id);
  if (error) return supabaseError(error);
  return NextResponse.json({ success: true });
}
