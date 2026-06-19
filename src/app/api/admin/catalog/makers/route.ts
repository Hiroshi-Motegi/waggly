import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

const updateMakerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().optional(),
  is_visible: z.boolean().optional(),
});

export async function GET() {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const { data, error } = await adminClient
    .from("catalog_makers")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) return supabaseError(error);
  return NextResponse.json(data);
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
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}
