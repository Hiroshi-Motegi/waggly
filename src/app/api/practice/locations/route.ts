import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";


export async function GET() {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("location")
    .eq("user_id", userId)
    .not("location", "is", null)
    .not("location", "eq", "")
    .order("practiced_at", { ascending: false });

  if (error) return NextResponse.json([], { status: 200 });

  // Deduplicate, preserve most-recent-first order
  const seen = new Set<string>();
  const locations: string[] = [];
  for (const row of data ?? []) {
    const loc = row.location?.trim();
    if (loc && !seen.has(loc)) {
      seen.add(loc);
      locations.push(loc);
    }
  }

  return NextResponse.json(locations);
}
