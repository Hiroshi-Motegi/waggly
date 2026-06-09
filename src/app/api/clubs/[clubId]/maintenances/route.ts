import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export const dynamic = "force-static";
export function generateStaticParams() {
  return [{ clubId: "_" }];
}


export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("user_id", userId)
    .single();

  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("maintenances")
    .select("*")
    .eq("club_id", clubId)
    .order("done_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("user_id", userId)
    .single();

  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("maintenances")
    .insert({ ...body, club_id: clubId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
