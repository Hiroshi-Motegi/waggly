import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

const specSchema = z.object({
  model_id: z.string().uuid(),
  club_number: z.string().min(1).max(50),
  loft: z.number().optional().nullable(),
  lie: z.number().optional().nullable(),
  bounce: z.number().optional().nullable(),
  length: z.number().optional().nullable(),
  weight: z.number().optional().nullable(),
  head_volume: z.number().optional().nullable(),
  head_weight: z.number().optional().nullable(),
  face_angle: z.number().optional().nullable(),
  swing_weight: z.string().max(10).optional().nullable(),
  shaft_name: z.string().max(200).optional().nullable(),
  shaft_flex: z.string().max(20).optional().nullable(),
  sort_order: z.number().int().optional(),
});

const createSpecsSchema = z.union([specSchema, z.array(specSchema)]);

const updateSpecSchema = z.object({ id: z.string().uuid() }).merge(specSchema.partial());

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const modelId = request.nextUrl.searchParams.get("model_id");
  if (!modelId) return badRequest("model_id required");

  const { data, error } = await adminClient
    .from("catalog_specs")
    .select("*")
    .eq("model_id", modelId)
    .order("sort_order")
    .order("club_number");
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = createSpecsSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const rows = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  const { data, error } = await adminClient
    .from("catalog_specs")
    .insert(rows)
    .select();
  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();

  // Bulk upsert: array of specs (used by SpecGridEditor save)
  if (Array.isArray(raw)) {
    const validated = raw.map((item) => updateSpecSchema.safeParse(item));
    const firstError = validated.find((v) => !v.success);
    if (firstError && !firstError.success) return badRequest(firstError.error.issues[0].message);

    const updates = validated.map((v) => {
      const { id, ...rest } = (v as { success: true; data: { id: string } }).data;
      return { id, rest };
    });

    // Parallel updates to avoid N+1 sequential queries
    const results = await Promise.all(
      updates.map(({ id, rest }) =>
        adminClient.from("catalog_specs").update(rest).eq("id", id).select().single()
      )
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) return supabaseError(failed.error);
    return NextResponse.json(results.map((r) => r.data));
  }

  // Single update
  const parsed = updateSpecSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);
  const { id, ...updates } = parsed.data;
  const { data, error } = await adminClient
    .from("catalog_specs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

const deleteSpecSchema = z.object({ id: z.string().uuid() });

export async function DELETE(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = deleteSpecSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { error } = await adminClient.from("catalog_specs").delete().eq("id", parsed.data.id);
  if (error) return supabaseError(error);
  return NextResponse.json({ success: true });
}
