import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export const dynamic = "force-static";
export function generateStaticParams() {
  return [{ id: "_" }];
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase } = auth;

  const body = await request.json();

  const { data, error } = await supabase
    .from("knowledge_base")
    .update(body)
    .eq("id", id)
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
  const { supabase } = auth;

  const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
