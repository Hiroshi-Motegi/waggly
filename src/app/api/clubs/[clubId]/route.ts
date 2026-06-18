import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { updateClubSchema } from "@/lib/api-schemas";
import { badRequest, notFound, supabaseError } from "@/lib/api-error";

export function generateStaticParams() {
  return [{ clubId: "_" }];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("clubs")
    .select("*, club_images(*), maintenances(*)")
    .eq("id", clubId)
    .eq("user_id", userId)
    .single();

  if (error) return notFound();
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const raw = await request.json();
  const parsed = updateClubSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
  }
  // Also allow sort_order through (numeric only)
  const updates: Record<string, unknown> = { ...parsed.data };
  if (typeof raw.sort_order === "number") {
    updates.sort_order = raw.sort_order;
  }

  const { data, error } = await supabase
    .from("clubs")
    .update(updates as any)
    .eq("id", clubId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { error } = await supabase
    .from("clubs")
    .delete()
    .eq("id", clubId)
    .eq("user_id", userId);

  if (error) return supabaseError(error);
  return NextResponse.json({ success: true });
}
