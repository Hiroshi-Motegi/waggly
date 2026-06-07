import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify club ownership
  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop();
  const filePath = `${user.id}/${clubId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("club-images")
    .upload(filePath, file);

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(image, { status: 201 });
}
