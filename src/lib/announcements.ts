import { createClient } from "@/lib/supabase/server";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  published_at: string;
}

export async function fetchAnnouncements(limit = 5): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("announcements")
    .select("id, title, body, published_at")
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data as Announcement[]) ?? [];
}

export async function fetchAnnouncement(id: string): Promise<Announcement | null> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("announcements")
    .select("id, title, body, published_at")
    .eq("id", id)
    .eq("is_published", true)
    .single();
  return (data as Announcement) ?? null;
}
