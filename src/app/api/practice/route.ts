import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";


export async function GET(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*, practice_clubs(*, club:clubs(id, club_number, category))")
    .eq("user_id", userId)
    .order("practiced_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { clubs: clubBalls, rating, ...sessionData } = await request.json();

  // Create session
  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .insert({ ...sessionData, user_id: userId })
    .select()
    .single();

  if (sessionError) {
    console.error("practice session insert error:", sessionError.message, sessionData);
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  // Create per-club records
  if (clubBalls && clubBalls.length > 0) {
    const records = clubBalls
      .filter((cb: any) => cb.balls > 0)
      .map((cb: any) => ({
        session_id: session.id,
        club_id: cb.club_id,
        balls: cb.balls,
        avg_distance: cb.avg_distance ?? null,
      }));

    if (records.length > 0) {
      const { error: clubError } = await supabase
        .from("practice_clubs")
        .insert(records);

      if (clubError) {
        console.error("practice clubs insert error:", clubError.message, records);
        return NextResponse.json({ error: clubError.message }, { status: 500 });
      }
    }

    // Create club memos linked to this session
    const memoRecords = clubBalls
      .filter((cb: any) => cb.memo?.condition)
      .map((cb: any) => ({
        club_id: cb.club_id,
        practice_session_id: session.id,
        distance: cb.avg_distance ?? null,
        memo: cb.memo.memo || null,
        condition: cb.memo.condition,
        symptom_tags: cb.memo.symptom_tags || [],
        feeling_tags: cb.memo.condition === "good" ? [] : (cb.memo.feeling_tags || []),
        gear_tags: cb.memo.condition === "good" ? [] : (cb.memo.gear_tags || []),
      }));

    if (memoRecords.length > 0) {
      const { error: memoError } = await supabase
        .from("club_memos")
        .insert(memoRecords);

      if (memoError) {
        console.error("club memos insert error:", memoError.message, memoRecords);
        return NextResponse.json({ error: memoError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json(session, { status: 201 });
}
