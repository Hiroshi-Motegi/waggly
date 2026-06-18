import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseError } from "@/lib/api-error";

export function generateStaticParams() {
  return [{ clubId: "_", maintenanceId: "_" }];
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string; maintenanceId: string }> }
) {
  const { clubId, maintenanceId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  if (!(await verifyClubOwnership(supabase, clubId, userId)))
    return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("maintenances")
    .select("*")
    .eq("id", maintenanceId)
    .eq("club_id", clubId)
    .single();

  if (error) return supabaseError(error);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; maintenanceId: string }> }
) {
  const { clubId, maintenanceId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  if (!(await verifyClubOwnership(supabase, clubId, userId)))
    return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("maintenances")
    .update(body)
    .eq("id", maintenanceId)
    .eq("club_id", clubId)
    .select()
    .single();

  if (error) return supabaseError(error);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string; maintenanceId: string }> }
) {
  const { clubId, maintenanceId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  if (!(await verifyClubOwnership(supabase, clubId, userId)))
    return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const { error } = await supabase
    .from("maintenances")
    .delete()
    .eq("id", maintenanceId)
    .eq("club_id", clubId);

  if (error) return supabaseError(error);
  return new NextResponse(null, { status: 204 });
}
