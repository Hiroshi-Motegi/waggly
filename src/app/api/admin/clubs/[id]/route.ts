import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, supabaseError } from "@/lib/api-error";

const linkSchema = z.object({
  catalog_model_id: z.string().uuid().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;
  const { id } = await params;

  const raw = await request.json();
  const parsed = linkSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { data, error } = await adminClient
    .from("clubs")
    .update({ catalog_model_id: parsed.data.catalog_model_id })
    .eq("id", id)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}
