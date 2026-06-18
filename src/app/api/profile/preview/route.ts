import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) return supabaseError(error);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: courses } = await supabase
    .from("favorite_courses")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, category, club_number, maker, model, bag_number, status, club_images(image_url, is_primary)")
    .eq("user_id", userId)
    .eq("hidden_from_profile", false)
    .in("status", ["bag", "reserve"])
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const filteredClubs = (clubs ?? []).filter(
    (c: { status: string; bag_number: number }) => c.status === "reserve" || (c.status === "bag" && (c.bag_number === 1 || c.bag_number === 2))
  );

  const { data: items } = await supabase
    .from("accessories")
    .select("id, category, brand, model, purchase_url, accessory_images(image_url, is_primary)")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("hidden_from_profile", false)
    .order("created_at", { ascending: false });

  // Cover images
  const { data: coverImages } = await supabase
    .from("profile_cover_images")
    .select("id, image_url")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  const vf = (profile.visible_fields ?? {}) as Record<string, boolean>;
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
