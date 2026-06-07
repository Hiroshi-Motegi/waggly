import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

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
    .select("*, practice_clubs(*, club:clubs(id, club_number, category))")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Replace club balls: delete existing then insert new
  const { error: deleteError } = await supabase
    .from("practice_clubs")
    .delete()
    .eq("session_id", sessionId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  if (clubBalls && clubBalls.length > 0) {
    const records = clubBalls
      .filter((cb: any) => cb.balls > 0)
      .map((cb: any) => ({
        session_id: sessionId,
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
