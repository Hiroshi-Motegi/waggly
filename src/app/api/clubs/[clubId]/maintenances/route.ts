import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError, withErrorHandler } from "@/lib/api-error";

export function generateStaticParams() {
  return [{ clubId: "_" }];
}

export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) => {
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

  if (error) return supabaseError(error);
  return NextResponse.json(data);
});

export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) => {
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

  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
});
