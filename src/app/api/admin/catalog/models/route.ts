import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

const updateModelSchema = z.object({
  id: z.string().uuid(),
  is_visible: z.boolean().optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
});

const createModelSchema = z.object({
  name: z.string().min(1).max(200),
  maker: z.string().min(1).max(100),
  maker_slug: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  slug: z.string().min(1).max(200).optional(),
  image_url: z.string().url().optional().nullable(),
  description: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const makerSlug = request.nextUrl.searchParams.get("maker_slug");
  let query = supabase
    .from("catalog_models")
    .select("*, catalog_specs(count)")
    .order("category");
  if (makerSlug) query = query.eq("maker_slug", makerSlug);

  const { data, error } = await query;
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const raw = await request.json();
  const parsed = createModelSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { data, error } = await supabase
    .from("catalog_models")
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
  const parsed = updateModelSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { id, ...updates } = parsed.data;
  const { data, error } = await adminClient
    .from("catalog_models")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}
