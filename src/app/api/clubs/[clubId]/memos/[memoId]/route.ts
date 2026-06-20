import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseError, withErrorHandler } from "@/lib/api-error";

export function generateStaticParams() {
  return [{ clubId: "_", memoId: "_" }];
}

async function verifyClubOwnership(supabase: SupabaseClient, clubId: string, userId: string) {
  const { data } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memoId: string }> }
) => {
  const { clubId, memoId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  if (!(await verifyClubOwnership(supabase, clubId, userId)))
    return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("club_memos")
    .select("*")
    .eq("id", memoId)
    .eq("club_id", clubId)
    .single();

  if (error) return supabaseError(error);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
});

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memoId: string }> }
) => {
  const { clubId, memoId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  if (!(await verifyClubOwnership(supabase, clubId, userId)))
    return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("club_memos")
    .update({
      distance: body.distance ?? null,
      memo: body.memo ?? null,
      condition: body.condition ?? null,
      symptom_tags: body.symptom_tags ?? [],
      feeling_tags: body.feeling_tags ?? [],
      gear_tags: body.gear_tags ?? [],
    })
    .eq("id", memoId)
    .eq("club_id", clubId)
    .select()
    .single();

  if (error) return supabaseError(error);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
});

export const DELETE = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string; memoId: string }> }
) => {
  const { clubId, memoId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  if (!(await verifyClubOwnership(supabase, clubId, userId)))
    return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const { error } = await supabase
    .from("club_memos")
    .delete()
    .eq("id", memoId)
    .eq("club_id", clubId);

  if (error) return supabaseError(error);
  return new NextResponse(null, { status: 204 });
});
