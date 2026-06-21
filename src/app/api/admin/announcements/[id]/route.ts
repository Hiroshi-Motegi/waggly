import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { badRequest, notFound, supabaseError } from "@/lib/api-error";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(10000).optional(),
  category: z.enum(["info", "feature", "maintenance", "campaign"]).optional(),
  published_at: z.string().optional(),
  is_published: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;
  const { id } = await params;

  const { data, error } = await adminClient
    .from("announcements")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return supabaseError(error);
  if (!data) return notFound("Announcement");
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;
  const { id } = await params;

  const raw = await request.json();
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const { data, error } = await adminClient
    .from("announcements")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;
  const { id } = await params;

  const { error } = await adminClient.from("announcements").delete().eq("id", id);
  if (error) return supabaseError(error);
  return NextResponse.json({ success: true });
}
