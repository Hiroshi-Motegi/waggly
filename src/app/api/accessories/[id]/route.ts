import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("accessories")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const body = await request.json();

  const { data, error } = await supabase
    .from("accessories")
    .update(body)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { error } = await supabase
    .from("accessories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
