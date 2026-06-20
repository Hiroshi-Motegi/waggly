import { createClient } from "@/lib/supabase/server";
import type { Announcement } from "@/lib/announcements-types";

export type { Announcement, AnnouncementCategory } from "@/lib/announcements-types";
export { categoryLabel, categoryColor } from "@/lib/announcements-types";

export async function fetchAnnouncements(limit = 5): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("announcements")
    .select("id, title, body, published_at, category")
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) console.error("fetchAnnouncements error:", error);
  return (data as Announcement[]) ?? [];
}

export async function fetchAnnouncement(id: string): Promise<Announcement | null> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("announcements")
    .select("id, title, body, published_at, category")
    .eq("id", id)
    .eq("is_published", true)
    .single();
  return (data as Announcement) ?? null;
}
