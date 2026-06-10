import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  // Use service role to bypass RLS — this endpoint filters data explicitly
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("is_public", true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: courses } = await supabase
    .from("favorite_courses")
    .select("*")
    .eq("user_id", profile.id)
    .order("sort_order", { ascending: true });

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, category, club_number, maker, model, club_images(image_url, is_primary)")
    .eq("user_id", profile.id)
    .eq("status", "bag")
    .eq("bag_number", 1)
    .order("sort_order", { ascending: true });

  const vf = profile.visible_fields ?? {};
  const publicProfile: Record<string, any> = {
    username: profile.username,
    avatar_url: profile.avatar_url,
  };
  if (vf.nickname !== false) publicProfile.nickname = profile.nickname;
  if (vf.bio !== false) publicProfile.bio = profile.bio;
  if (vf.golf_start_date !== false) publicProfile.golf_start_date = profile.golf_start_date;
  if (vf.average_score !== false) publicProfile.average_score = profile.average_score;
  if (vf.best_score !== false) publicProfile.best_score = profile.best_score;
  if (vf.home_course !== false) publicProfile.home_course = profile.home_course;
  if (vf.sns_links !== false) publicProfile.sns_links = profile.sns_links;
  if (vf.bag !== false) publicProfile.clubs = clubs ?? [];
  if (vf.favorite_courses !== false) publicProfile.courses = courses ?? [];

  return NextResponse.json(publicProfile);
}
