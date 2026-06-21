import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

const shaftSchema = z.object({
  shaft_name: z.string().min(1).max(200),
  maker: z.string().max(100).optional().nullable(),
  shaft_type: z.string().max(50).optional().nullable(),
  flex: z.string().max(20).optional().nullable(),
  shaft_weight: z.number().optional().nullable(),
  torque: z.number().optional().nullable(),
  kick_point: z.string().max(50).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  is_visible: z.boolean().optional(),
  verification_status: z.enum(["verified", "in_review", "unverified"]).optional(),
  spec_updated_at: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
});

const updateSchema = z.object({ id: z.string().uuid() }).merge(shaftSchema.partial());
const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()),
  is_visible: z.boolean().optional(),
  verification_status: z.enum(["verified", "in_review", "unverified"]).optional(),
});

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const params = request.nextUrl.searchParams;
  let query = adminClient.from("catalog_shafts").select("*").order("sort_order").order("shaft_name");

  const search = params.get("search");
  if (search) query = query.ilike("shaft_name", `%${search}%`);
  const shaftType = params.get("shaft_type");
  if (shaftType) query = query.eq("shaft_type", shaftType);
  const maker = params.get("maker");
  if (maker) query = query.ilike("maker", `%${maker}%`);

  const { data, error } = await query;
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = shaftSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { data, error } = await adminClient
    .from("catalog_shafts")
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

  // Discriminate by presence of "ids" field
  if (Array.isArray(raw.ids)) {
    const bulk = bulkUpdateSchema.safeParse(raw);
    if (!bulk.success) return badRequest(bulk.error.issues[0].message);
    const { ids, ...updates } = bulk.data;
    const { error } = await adminClient
      .from("catalog_shafts")
      .update(updates)
      .in("id", ids);
    if (error) return supabaseError(error);
    return NextResponse.json({ updated: ids.length });
  }

  // Single update
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);
  const { id, ...updates } = parsed.data;
  const { data, error } = await adminClient
    .from("catalog_shafts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function DELETE(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { error } = await adminClient.from("catalog_shafts").delete().eq("id", parsed.data.id);
  if (error) return supabaseError(error);
  return NextResponse.json({ success: true });
}
