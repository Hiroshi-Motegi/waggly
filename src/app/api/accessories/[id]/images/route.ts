import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

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

  // Verify ownership
  const { data: item } = await supabase
    .from("accessories")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }
  const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  const ext = extMap[file.type] || "jpg";
  const filePath = `accessories/${userId}/${id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("club-images")
    .upload(filePath, file);

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from("club-images")
    .getPublicUrl(filePath);

  // Check if first image
  const { count } = await supabase
    .from("accessory_images")
    .select("id", { count: "exact", head: true })
    .eq("accessory_id", id);

  const { data: image, error } = await supabase
    .from("accessory_images")
    .insert({
      accessory_id: id,
      image_url: publicUrl,
      is_primary: count === 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(image, { status: 201 });
}
