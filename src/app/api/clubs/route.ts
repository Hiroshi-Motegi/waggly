import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export async function GET(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const status = request.nextUrl.searchParams.get("status");

  let query = supabase
    .from("clubs")
    .select("*, club_images(*)")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch latest distance per club from memos and practice
  if (data && data.length > 0) {
    const clubIds = data.map((c: any) => c.id);

    // Latest memo distance per club
    const { data: latestMemos } = await supabase
      .from("club_memos")
      .select("club_id, distance, created_at")
      .in("club_id", clubIds)
      .not("distance", "is", null)
      .order("created_at", { ascending: false });

    // Latest practice avg_distance per club (join session for practiced_at as timestamp)
    const { data: latestPractice } = await supabase
      .from("practice_clubs")
      .select("club_id, avg_distance, session:practice_sessions(practiced_at, created_at)")
      .in("club_id", clubIds)
      .not("avg_distance", "is", null);

    // Pick the most recent distance from either source
    const latestByClub = new Map<string, number>();

    // Collect candidates: { club_id, distance, timestamp }
    const candidates: { club_id: string; distance: number; timestamp: string }[] = [];
    if (latestMemos) {
      for (const row of latestMemos) {
        candidates.push({ club_id: row.club_id, distance: row.distance!, timestamp: row.created_at });
      }
    }
    if (latestPractice) {
      for (const row of latestPractice) {
        const session = row.session as any;
        const ts = session?.created_at ?? session?.practiced_at ?? "";
        if (ts) {
          candidates.push({ club_id: row.club_id, distance: row.avg_distance!, timestamp: ts });
        }
      }
    }
    // Sort by timestamp desc, keep first per club
    candidates.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    for (const c of candidates) {
      if (!latestByClub.has(c.club_id)) {
        latestByClub.set(c.club_id, c.distance);
      }
    }

    for (const club of data) {
      const dist = latestByClub.get(club.id);
      if (dist != null) {
        (club as any).latest_avg_distance = dist;
      }
    }
  }

  return NextResponse.json(data);
}

/**
 * Standard golf club sort order:
 * DR(1W) → FW(2W-9W) → UT(2U-7U) → Iron(3I-9I) → Wedge(PW,AW,SW,LW) → Putter
 */
function computeSortOrder(category: string, clubNumber: string): number {
  const categoryOrder: Record<string, number> = {
    driver: 100,
    fairway_wood: 200,
    utility: 300,
    iron: 400,
    wedge: 500,
    putter: 600,
  };
  const base = categoryOrder[category] ?? 900;

  // Extract numeric part from club_number (e.g. "5W" → 5, "PW" → special)
  const wedgeOrder: Record<string, number> = { PW: 1, AW: 2, SW: 3, LW: 4 };
  if (category === "wedge" && wedgeOrder[clubNumber]) {
    return base + wedgeOrder[clubNumber];
  }
  if (category === "driver") return base;
  if (category === "putter") return base;

  const num = parseInt(clubNumber, 10);
  return base + (isNaN(num) ? 50 : num);
}

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const body = await request.json();
  const sortOrder = computeSortOrder(body.category ?? "", body.club_number ?? "");

  const { data, error } = await supabase
    .from("clubs")
    .insert({ ...body, user_id: userId, sort_order: sortOrder })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
