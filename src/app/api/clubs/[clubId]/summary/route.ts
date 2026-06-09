import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";

export const dynamic = "force-static";
export function generateStaticParams() {
  return [{ clubId: "_" }];
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase } = auth;
  const { clubId } = await params;

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

  const totalBalls = (practiceClubs ?? []).reduce((sum: number, pc: any) => sum + (pc.balls ?? 0), 0);
  const distances = (practiceClubs ?? [])
    .map((pc: any) => pc.avg_distance)
    .filter((d: any) => d != null);
  const avgDistance = distances.length > 0
    ? Math.round(distances.reduce((a: number, b: number) => a + b, 0) / distances.length)
    : null;

  const tagCounts: Record<string, number> = {};
  const conditionCounts = { good: 0, normal: 0, bad: 0 };

  (memos ?? []).forEach((m: any) => {
    if (m.condition) conditionCounts[m.condition as keyof typeof conditionCounts]++;
    [...(m.symptom_tags ?? []), ...(m.feeling_tags ?? []), ...(m.gear_tags ?? [])].forEach((tag: string) => {
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
}
