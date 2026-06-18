import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError } from "@/lib/api-error";

const MAX_COVER_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT_MAP: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("profile_cover_images")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) return supabaseError(error);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { count } = await supabase
    .from("profile_cover_images")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) >= MAX_COVER_IMAGES) {
    return NextResponse.json({ error: "Maximum 5 cover images allowed" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const ext = EXT_MAP[file.type] || "jpg";
  const filePath = `covers/${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("club-images")
    .upload(filePath, file);

  if (uploadError) return supabaseError(uploadError);

  const { data: { publicUrl } } = supabase.storage
    .from("club-images")
    .getPublicUrl(filePath);

  const { data: image, error } = await supabase
    .from("profile_cover_images")
    .insert({
      user_id: userId,
      image_url: publicUrl,
      sort_order: (count ?? 0),
    })
    .select()
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(image, { status: 201 });
}
