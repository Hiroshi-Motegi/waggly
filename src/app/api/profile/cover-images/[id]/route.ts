import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, getAdminClient, unauthorized } from "@/lib/supabase/api";
import { supabaseError } from "@/lib/api-error";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data: image } = await supabase
    .from("profile_cover_images")
    .select("id, image_url")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const url = new URL(image.image_url);
    const storagePath = url.pathname.split("/object/public/club-images/")[1];
    if (storagePath) {
      await getAdminClient().storage.from("club-images").remove([storagePath]);
    }
  } catch {
    // Storage cleanup failure is non-fatal
  }

  const { error } = await supabase
    .from("profile_cover_images")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return supabaseError(error);
  return NextResponse.json({ success: true });
}
