import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const BUCKET = "club-spec-images";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** POST: アップロード → own_image_url に保存 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getAdmin();

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, or WebP." }, { status: 400 });
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const filePath = `specs/${id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(filePath);

  await admin.from("heads").update({ own_image_url: publicUrl }).eq("id", id);

  const { data: updated } = await admin
    .from("heads")
    .select("*, series:sets(*)")
    .eq("id", id)
    .single();

  return NextResponse.json(updated);
}

/** DELETE: own_image_url をクリア */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getAdmin();

  await admin.from("heads").update({ own_image_url: null }).eq("id", id);

  const { data: updated } = await admin
    .from("heads")
    .select("*, series:sets(*)")
    .eq("id", id)
    .single();

  return NextResponse.json(updated);
}
