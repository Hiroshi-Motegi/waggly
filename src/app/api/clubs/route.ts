import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { createClubSchema } from "@/lib/api-schemas";
import { badRequest, supabaseError } from "@/lib/api-error";
import { computeSortOrder } from "@/lib/club-sort";
import type { Database } from "@/types/supabase";


export async function GET(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const status = request.nextUrl.searchParams.get("status");
  const bagNumber = request.nextUrl.searchParams.get("bag_number");

  let query = supabase
    .from("clubs")
    .select("*, club_images(*)")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }
  if (bagNumber) {
    query = query.eq("bag_number", parseInt(bagNumber, 10));
  }

  const { data, error } = await query;

  if (error) return supabaseError(error);

  // Fetch latest distance per club from memos and practice (parallel)
  if (data && data.length > 0) {
    const clubIds = data.map((c: { id: string }) => c.id);

    const [{ data: latestMemos }, { data: latestPractice }] = await Promise.all([
      supabase
        .from("club_memos")
        .select("club_id, distance, created_at")
        .in("club_id", clubIds)
        .not("distance", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("practice_clubs")
        .select("club_id, avg_distance, session:practice_sessions(practiced_at, created_at)")
        .in("club_id", clubIds)
        .not("avg_distance", "is", null),
    ]);

    // Pick the most recent distance from either source
    const latestByClub = new Map<string, number>();
    const candidates: { club_id: string; distance: number; timestamp: string }[] = [];

    if (latestMemos) {
      for (const row of latestMemos) {
        candidates.push({ club_id: row.club_id, distance: row.distance!, timestamp: row.created_at });
      }
    }
    if (latestPractice) {
      for (const row of latestPractice) {
        const session = row.session as { created_at?: string; practiced_at?: string } | null;
        const ts = session?.created_at ?? session?.practiced_at ?? "";
        if (ts) {
          candidates.push({ club_id: row.club_id, distance: row.avg_distance!, timestamp: ts });
        }
      }
    }

    candidates.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    for (const c of candidates) {
      if (!latestByClub.has(c.club_id)) {
        latestByClub.set(c.club_id, c.distance);
      }
    }

    for (const club of data) {
      const dist = latestByClub.get(club.id);
      if (dist != null) {
        (club as Record<string, unknown>).latest_avg_distance = dist;
      }
    }
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const raw = await request.json();
  const parsed = createClubSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const body = parsed.data;
  const sortOrder = computeSortOrder(body.category ?? "", body.club_number ?? "");

  type ClubInsert = Database["public"]["Tables"]["clubs"]["Insert"];
  const { data, error } = await supabase
    .from("clubs")
    .insert({ ...body, user_id: userId, sort_order: sortOrder } as ClubInsert)
    .select()
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json(data, { status: 201 });
}
