import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError } from "@/lib/api-error";

export function generateStaticParams() {
  return [{ id: "_", imageId: "_" }];
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await params;
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

  const { error } = await supabase
    .from("accessory_images")
    .delete()
    .eq("id", imageId)
    .eq("accessory_id", id);

  if (error) return supabaseError(error);
  return NextResponse.json({ ok: true });
}
