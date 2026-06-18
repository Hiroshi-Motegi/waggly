import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError } from "@/lib/api-error";


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

  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
}
