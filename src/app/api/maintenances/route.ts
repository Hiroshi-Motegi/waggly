import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export const dynamic = "force-static";

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const body = await request.json();

  // Verify club ownership
  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", body.club_id)
    .eq("user_id", userId)
    .single();

  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("maintenances")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
