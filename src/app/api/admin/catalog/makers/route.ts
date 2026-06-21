import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

const createMakerSchema = z.object({
  name: z.string().min(1).max(100),
  name_ja: z.string().max(100).optional().nullable(),
  slug: z.string().min(1).max(100),
  image_url: z.string().url().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  is_visible: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const updateMakerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  name_ja: z.string().max(100).optional().nullable(),
  slug: z.string().max(100).optional(),
  image_url: z.string().url().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  sort_order: z.number().int().optional(),
  is_visible: z.boolean().optional(),
});

export async function GET() {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const { data, error } = await adminClient
    .from("catalog_makers")
    .select("*, catalog_models(count)")
    .order("sort_order")
    .order("name");
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const raw = await request.json();
  const parsed = createMakerSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { data, error } = await adminClient
    .from("catalog_makers")
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
  const parsed = updateMakerSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { id, ...updates } = parsed.data;
  const { data, error } = await adminClient
    .from("catalog_makers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}
