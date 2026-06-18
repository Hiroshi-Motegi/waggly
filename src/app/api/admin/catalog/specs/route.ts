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
  swing_weight: z.string().max(10).optional().nullable(),
  sort_order: z.number().int().optional(),
});

const createSpecsSchema = z.union([specSchema, z.array(specSchema)]);

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const modelId = request.nextUrl.searchParams.get("model_id");
  if (!modelId) return badRequest("model_id required");

  const { data, error } = await supabase
    .from("catalog_specs")
    .select("*")
    .eq("model_id", modelId)
    .order("sort_order");
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const raw = await request.json();
  const parsed = createSpecsSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const rows = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  const { data, error } = await supabase
    .from("catalog_specs")
    .insert(rows)
    .select();
  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
}
