import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*, practice_clubs(*, club:clubs(id, club_number, category))")
    .eq("user_id", user.id)
    .order("practiced_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clubs: clubBalls, ...sessionData } = await request.json();

  // Create session
  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .insert({ ...sessionData, user_id: user.id })
    .select()
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  // Create per-club records
  if (clubBalls && clubBalls.length > 0) {
    const records = clubBalls
      .filter((cb: any) => cb.balls > 0)
      .map((cb: any) => ({
        session_id: session.id,
        club_id: cb.club_id,
        balls: cb.balls,
      }));

    if (records.length > 0) {
      const { error: clubError } = await supabase
        .from("practice_clubs")
        .insert(records);

      if (clubError) return NextResponse.json({ error: clubError.message }, { status: 500 });
    }
  }

  return NextResponse.json(session, { status: 201 });
}
