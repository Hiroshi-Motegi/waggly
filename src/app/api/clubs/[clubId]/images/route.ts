import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, getAdminClient, unauthorized } from "@/lib/supabase/api";
import { supabaseError } from "@/lib/api-error";

export function generateStaticParams() {
  return [{ clubId: "_" }];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  // Verify club ownership
  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("user_id", userId)
    .single();

  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }
  const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  const ext = extMap[file.type] || "jpg";
  const filePath = `${userId}/${clubId}/${Date.now()}.${ext}`;

  const adminStorage = getAdminClient().storage;

  const { error: uploadError } = await adminStorage
    .from("club-images")
    .upload(filePath, file);

  if (uploadError) return supabaseError(uploadError);

  const { data: { publicUrl } } = adminStorage
    .from("club-images")
    .getPublicUrl(filePath);

  // Check if this is the first image (make it primary)
  const { count } = await supabase
    .from("club_images")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId);

  const { data: image, error } = await supabase
    .from("club_images")
    .insert({
      club_id: clubId,
      image_url: publicUrl,
      is_primary: count === 0,
    })
    .select()
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(image, { status: 201 });
}
