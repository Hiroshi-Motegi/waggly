import type { SupabaseClient } from "@supabase/supabase-js";

export interface AnonymousSessionData {
  total_count: number;
  avg_rating: number | null;
  ratings: { rating: number; count: number }[];
  top_clubs: { club_number: string; total_balls: number }[];
  memos: string[];
  low_rated_memos: string[];
}

export interface AnonymousPlanData {
  total_count: number;
  avg_rating: number | null;
  high_rated: { title: string; rating: number }[];
  low_rated: { title: string; rating: number }[];
  comments: string[];
}

export async function getAnonymousSessions(
  supabase: SupabaseClient,
  days: number
): Promise<AnonymousSessionData> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: sessions } = await supabase
    .from("practice_sessions")
    .select("total_balls, memo, rating, practice_clubs(balls, club:clubs(club_number))")
    .gte("practiced_at", since);

  const items = sessions ?? [];

  // Rating distribution
  const ratingCounts = new Map<number, number>();
  let ratingSum = 0;
  let ratingCount = 0;
  for (const s of items) {
    if (s.rating != null) {
      ratingCounts.set(s.rating, (ratingCounts.get(s.rating) ?? 0) + 1);
      ratingSum += s.rating;
      ratingCount++;
    }
  }

  // Top clubs by total balls
  const clubBalls = new Map<string, number>();
  for (const s of items) {
    for (const pc of s.practice_clubs ?? []) {
      const cn = (pc as any).club?.club_number ?? "?";
      clubBalls.set(cn, (clubBalls.get(cn) ?? 0) + pc.balls);
    }
  }
  const topClubs = [...clubBalls.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([club_number, total_balls]) => ({ club_number, total_balls }));

  // Memos (anonymized - strip location-like patterns)
  const allMemos = items
    .filter((s) => s.memo)
    .map((s) => s.memo!.replace(/[\w\u3000-\u9FFF]+練習場/g, "練習場").trim())
    .filter((m) => m.length > 0);

  const lowRatedMemos = items
    .filter((s) => s.rating != null && s.rating <= 2 && s.memo)
    .map((s) => s.memo!.replace(/[\w\u3000-\u9FFF]+練習場/g, "練習場").trim());

  return {
    total_count: items.length,
    avg_rating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    ratings: [...ratingCounts.entries()]
      .map(([rating, count]) => ({ rating, count }))
      .sort((a, b) => a.rating - b.rating),
    top_clubs: topClubs,
    memos: allMemos.slice(0, 20),
    low_rated_memos: lowRatedMemos.slice(0, 10),
  };
}

export async function getAnonymousPlanFeedback(
  supabase: SupabaseClient,
  days: number
): Promise<AnonymousPlanData> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: plans } = await supabase
    .from("practice_plans")
    .select("title, status, rating, memo")
    .gte("created_at", since)
    .not("rating", "is", null);

  const items = plans ?? [];

  let ratingSum = 0;
  for (const p of items) ratingSum += p.rating;

  return {
    total_count: items.length,
    avg_rating: items.length > 0 ? Math.round((ratingSum / items.length) * 10) / 10 : null,
    high_rated: items
      .filter((p) => p.rating >= 4)
      .map((p) => ({ title: p.title, rating: p.rating })),
    low_rated: items
      .filter((p) => p.rating <= 2)
      .map((p) => ({ title: p.title, rating: p.rating })),
    comments: items
      .filter((p) => p.memo)
      .map((p) => p.memo!)
      .slice(0, 15),
  };
}
