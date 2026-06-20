import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { withErrorHandler } from "@/lib/api-error";

export function generateStaticParams() {
  return [{ clubId: "_" }];
}

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) => {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;
  const { clubId } = await params;

  // Verify ownership
  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: practiceClubs } = await supabase
    .from("practice_clubs")
    .select("balls, avg_distance, session_id, practice_sessions!inner(practiced_at)")
    .eq("club_id", clubId)
    .gte("practice_sessions.practiced_at", threeMonthsAgo.toISOString().split("T")[0]);

  const { data: memos } = await supabase
    .from("club_memos")
    .select("*")
    .eq("club_id", clubId)
    .gte("created_at", threeMonthsAgo.toISOString())
    .order("created_at", { ascending: false });

  const totalBalls = (practiceClubs ?? []).reduce((sum: number, pc: { balls: number }) => sum + (pc.balls ?? 0), 0);
  const distances = (practiceClubs ?? [])
    .map((pc: { avg_distance: number | null }) => pc.avg_distance)
    .filter((d: number | null): d is number => d != null);
  const avgDistance = distances.length > 0
    ? Math.round(distances.reduce((a: number, b: number) => a + b, 0) / distances.length)
    : null;

  const tagCounts: Record<string, number> = {};
  const conditionCounts = { good: 0, normal: 0, bad: 0 };

  (memos ?? []).forEach((m) => {
    if (m.condition) conditionCounts[m.condition as keyof typeof conditionCounts]++;
    const tags = [
      ...((m.symptom_tags ?? []) as string[]),
      ...((m.feeling_tags ?? []) as string[]),
      ...((m.gear_tags ?? []) as string[]),
    ];
    tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  return NextResponse.json({
    totalBalls,
    avgDistance,
    memoCount: (memos ?? []).length,
    conditionCounts,
    topTags,
    recentMemos: (memos ?? []).slice(0, 5),
  });
});
