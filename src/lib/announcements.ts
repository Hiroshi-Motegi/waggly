import { createClient } from "@/lib/supabase/server";
import type { Announcement } from "@/lib/announcements-types";

export type { Announcement, AnnouncementCategory } from "@/lib/announcements-types";
export { categoryLabel, categoryColor } from "@/lib/announcements-types";

export async function fetchAnnouncements(limit = 5): Promise<Announcement[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/announcements?select=id,title,body,published_at,category&is_published=eq.true&published_at=lte.${new Date().toISOString()}&order=published_at.desc&limit=${limit}`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return [];
  return (await res.json()) as Announcement[];
}

export async function fetchAnnouncement(id: string): Promise<Announcement | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/announcements?select=id,title,body,published_at,category&id=eq.${id}&is_published=eq.true&limit=1`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] ?? null;
}
