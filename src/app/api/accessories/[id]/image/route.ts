import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, getAdminClient, unauthorized } from "@/lib/supabase/api";
import { supabaseError } from "@/lib/api-error";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }
  const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  const ext = extMap[file.type] || "jpg";
  const filePath = `accessories/${userId}/${id}/${Date.now()}.${ext}`;

  const adminStorage = getAdminClient().storage;

  const { error: uploadError } = await adminStorage
    .from("club-images")
    .upload(filePath, file);

  if (uploadError) return supabaseError(uploadError);

  const { data: { publicUrl } } = adminStorage
    .from("club-images")
    .getPublicUrl(filePath);

  const { data, error } = await supabase
    .from("accessories")
    .update({ image_url: publicUrl })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("accessories")
    .update({ image_url: null })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(data);
}
