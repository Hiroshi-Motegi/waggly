import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { createPracticeSchema } from "@/lib/api-schemas";
import { badRequest } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const month = request.nextUrl.searchParams.get("month");

  let query = supabase
    .from("practice_sessions")
    .select("*, practice_clubs(*, club:clubs(id, club_number, category))")
    .eq("user_id", userId)
    .order("practiced_at", { ascending: false });

  if (month) {
    const start = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const endDate = new Date(y, m, 1);
    const end = endDate.toISOString().split("T")[0];
    query = query.gte("practiced_at", start).lt("practiced_at", end);
  } else {
    query = query.limit(20);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const raw = await request.json();
  const parsed = createPracticeSchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const { clubs: clubBalls, ...sessionData } = parsed.data;

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
    const records = (clubBalls as NonNullable<typeof clubBalls>)
      .filter((cb) => cb.balls > 0)
      .map((cb) => ({
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
    const memoRecords = (clubBalls as NonNullable<typeof clubBalls>)
      .filter((cb) => cb.memo?.condition)
      .map((cb) => {
        const memo = cb.memo!;
        return {
          club_id: cb.club_id,
          practice_session_id: session.id,
          distance: cb.avg_distance ?? null,
          memo: memo.memo || null,
          condition: memo.condition,
          symptom_tags: memo.symptom_tags || [],
          feeling_tags: memo.condition === "good" ? [] : (memo.feeling_tags || []),
          gear_tags: memo.condition === "good" ? [] : (memo.gear_tags || []),
        };
      });

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
