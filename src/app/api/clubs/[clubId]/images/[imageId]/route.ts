import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export function generateStaticParams() {
  return [{ clubId: "_", imageId: "_" }];
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clubId: string; imageId: string }> }
) {
  const { clubId, imageId } = await params;
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  // Verify ownership
  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("user_id", userId)
    .single();

  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase
    .from("club_images")
    .delete()
    .eq("id", imageId)
    .eq("club_id", clubId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
