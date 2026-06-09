import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export const dynamic = "force-static";
export function generateStaticParams() {
  return [{ planId: "_" }];
}

export async function GET() {
  return new Response(null, { status: 405 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const body = await request.json();
  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.memo !== undefined) updateData.memo = body.memo;
  if (body.rating !== undefined) updateData.rating = body.rating;

  const { data, error } = await supabase
    .from("practice_plans")
    .update(updateData)
    .eq("id", planId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  await supabase.from("practice_plans").delete().eq("id", planId).eq("user_id", userId);
  return NextResponse.json({ success: true });
}
