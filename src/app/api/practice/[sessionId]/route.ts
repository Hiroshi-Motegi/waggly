import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError } from "@/lib/api-error";

interface ClubBallInput {
  club_id: string;
  balls: number;
  avg_distance?: number | null;
  memo?: {
    condition: string;
    memo?: string;
    symptom_tags?: string[];
    feeling_tags?: string[];
    gear_tags?: string[];
  } | null;
}

export function generateStaticParams() {
  return [{ sessionId: "_" }];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { sessionId } = await params;

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*, practice_clubs(*, club:clubs(id, club_number, category, maker, model))")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error) return supabaseError(error);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch memos linked to this session
  const { data: memos } = await supabase
    .from("club_memos")
    .select("*")
    .eq("practice_session_id", sessionId);

  // Merge memos into practice_clubs
  if (data.practice_clubs && memos) {
    const memoByClub = new Map(memos.map((m) => [m.club_id, m]));
    const enrichedClubs = data.practice_clubs.map((pc) => ({
      ...pc,
      memo: memoByClub.get(pc.club_id) ?? null,
    }));
    (data as Record<string, unknown>).practice_clubs = enrichedClubs;
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { sessionId } = await params;
  const { clubs: clubBalls, ...sessionData } = await request.json();

  // Update session fields
  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .update(sessionData)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (sessionError) return supabaseError(sessionError);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // clubBalls が送信された場合のみ practice_clubs と club_memos を置き換え
  if (clubBalls !== undefined) {
    // Replace club balls: delete existing then insert new
    const { error: deleteError } = await supabase
      .from("practice_clubs")
      .delete()
      .eq("session_id", sessionId);

    if (deleteError) return supabaseError(deleteError);

    if (clubBalls && clubBalls.length > 0) {
      const records = (clubBalls as ClubBallInput[])
        .filter((cb) => cb.balls > 0)
        .map((cb) => ({
          session_id: sessionId,
          club_id: cb.club_id,
          balls: cb.balls,
          avg_distance: cb.avg_distance ?? null,
        }));

      if (records.length > 0) {
        const { error: clubError } = await supabase
          .from("practice_clubs")
          .insert(records);

        if (clubError) return supabaseError(clubError);
      }
    }

    // Replace memos linked to this session: delete existing then insert new
    const { error: memoDeleteError } = await supabase
      .from("club_memos")
      .delete()
      .eq("practice_session_id", sessionId);

    if (memoDeleteError) return supabaseError(memoDeleteError);

    if (clubBalls && clubBalls.length > 0) {
      const memoRecords = (clubBalls as ClubBallInput[])
        .filter((cb) => cb.memo?.condition)
        .map((cb) => {
          const memo = cb.memo!;
          return {
            club_id: cb.club_id,
            practice_session_id: sessionId,
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

        if (memoError) return supabaseError(memoError);
      }
    }
  }

  return NextResponse.json(session);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { sessionId } = await params;

  const { error } = await supabase
    .from("practice_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) return supabaseError(error);
  return NextResponse.json({ success: true });
}
