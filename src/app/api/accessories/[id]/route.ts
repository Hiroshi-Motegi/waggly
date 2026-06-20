import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { notFound, supabaseError } from "@/lib/api-error";
import type { Database } from "@/types/supabase";

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
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("accessories")
    .select("*, accessory_images(*)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) return notFound();
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

  type AccessoryUpdate = Database["public"]["Tables"]["accessories"]["Update"];
  const ALLOWED = ["category", "brand", "model", "memo", "rating", "status", "purchase_url", "hidden_from_profile"] as const;
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => (ALLOWED as readonly string[]).includes(k))
  ) as AccessoryUpdate;

  const { data, error } = await supabase
    .from("accessories")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return supabaseError(error);
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

  if (error) return supabaseError(error);
  return NextResponse.json({ success: true });
}
