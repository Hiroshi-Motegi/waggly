import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("favorite_courses")
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

  const body = await request.json();

  // Duplicate check
  if (body.gora_course_id) {
    const { data: existing } = await supabase
      .from("favorite_courses")
      .select("id")
      .eq("user_id", userId)
      .eq("gora_course_id", body.gora_course_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "このコースは既に登録されています" }, { status: 409 });
    }
  } else if (body.course_name) {
    const { data: existing } = await supabase
      .from("favorite_courses")
      .select("id")
      .eq("user_id", userId)
      .eq("course_name", body.course_name)
      .eq("is_manual", true)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "このコースは既に登録されています" }, { status: 409 });
    }
  }

  const { count } = await supabase
    .from("favorite_courses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data, error } = await supabase
    .from("favorite_courses")
    .insert({
      user_id: userId,
      gora_course_id: body.gora_course_id ?? null,
      course_name: body.course_name,
      course_image_url: body.course_image_url ?? null,
      evaluation: body.evaluation ?? null,
      address: body.address ?? null,
      is_manual: body.is_manual ?? false,
      sort_order: count ?? 0,
    })
    .select()
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { order } = await request.json();

  await Promise.all(
    order.map((item: { id: string; sort_order: number }) =>
      supabase
        .from("favorite_courses")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id)
        .eq("user_id", userId)
    )
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { id } = await request.json();

  const { error } = await supabase
    .from("favorite_courses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return supabaseError(error);
  return NextResponse.json({ ok: true });
}
