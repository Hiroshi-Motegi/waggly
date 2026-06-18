import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseError } from "@/lib/api-error";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

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

  if (error) return supabaseError(error);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: courses } = await supabase
    .from("favorite_courses")
    .select("*")
    .eq("user_id", profile.id)
    .order("sort_order", { ascending: true });

  // Clubs: bag (bag_number 1 or 2) + reserve, excluding hidden
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, category, club_number, maker, model, bag_number, status, club_images(image_url, is_primary)")
    .eq("user_id", profile.id)
    .eq("hidden_from_profile", false)
    .in("status", ["bag", "reserve"])
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  // Filter out bag_number=0 for bag status clubs
  const filteredClubs = (clubs ?? []).filter(
    (c: { status: string; bag_number: number }) => c.status === "reserve" || (c.status === "bag" && (c.bag_number === 1 || c.bag_number === 2))
  );

  // Items: active, excluding hidden
  const { data: items } = await supabase
    .from("accessories")
    .select("id, category, brand, model, purchase_url, accessory_images(image_url, is_primary)")
    .eq("user_id", profile.id)
    .eq("status", "active")
    .eq("hidden_from_profile", false)
    .order("created_at", { ascending: false });

  // Cover images
  const { data: coverImages } = await supabase
    .from("profile_cover_images")
    .select("id, image_url")
    .eq("user_id", profile.id)
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
  if (vf.cover_images !== false) publicProfile.cover_images = coverImages ?? [];
  if (vf.bag !== false) publicProfile.clubs = filteredClubs;
  if (vf.items !== false) publicProfile.items = items ?? [];
  if (vf.favorite_courses !== false) publicProfile.courses = courses ?? [];

  return NextResponse.json(publicProfile);
}
