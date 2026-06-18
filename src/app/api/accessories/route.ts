import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { createAccessorySchema } from "@/lib/api-schemas";
import { badRequest, supabaseError } from "@/lib/api-error";


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

  if (error) return supabaseError(error);

  // Merge primary image into image_url for backward compatibility
  const result = (data ?? []).map(({ accessory_images, ...rest }: { accessory_images?: { image_url: string }[]; image_url: string | null; [key: string]: unknown }) => ({
    ...rest,
    image_url: rest.image_url ?? accessory_images?.[0]?.image_url ?? null,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const raw = await request.json();
  const parsed = createAccessorySchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const body = parsed.data;

  const { data, error } = await supabase
    .from("accessories")
    .insert({ ...body, user_id: userId })
    .select()
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
}
