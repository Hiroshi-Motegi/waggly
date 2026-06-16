import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";


export async function GET(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const status = request.nextUrl.searchParams.get("status");

  let query = supabase
    .from("accessories")
    .select("*, accessory_images(image_url)")
    .eq("user_id", userId)
    .eq("accessory_images.is_primary", true)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Merge primary image into image_url for backward compatibility
  const result = (data ?? []).map(({ accessory_images, ...rest }: any) => ({
    ...rest,
    image_url: rest.image_url ?? accessory_images?.[0]?.image_url ?? null,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const body = await request.json();

  const { data, error } = await supabase
    .from("accessories")
    .insert({ ...body, user_id: userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
