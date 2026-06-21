import { NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { supabaseError } from "@/lib/api-error";

export async function GET() {
  const result = await requireAdmin();
  if (isErrorResponse(result)) return result;
  const { adminClient } = result;

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Parallel KPI queries
  const [usersRes, paidRes, clubsRes, practiceRes, usersWeekRes, clubsWeekRes] =
    await Promise.all([
      // Total users
      adminClient.from("users").select("id", { count: "exact", head: true }),
      // Paid subscribers
      adminClient
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      // Total clubs
      adminClient.from("clubs").select("id", { count: "exact", head: true }),
      // Practice sessions this week
      adminClient
        .from("practice_sessions")
        .select("id", { count: "exact", head: true })
        .gte("practiced_at", startOfWeek.toISOString()),
      // New users since last week (for +delta)
      adminClient
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte("created_at", oneWeekAgo),
      // New clubs since last week
      adminClient
        .from("clubs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", oneWeekAgo),
    ]);

  // Weekly trends (past 12 weeks) — 2 queries instead of 24
  const twelveWeeksAgo = new Date(now);
  twelveWeeksAgo.setDate(now.getDate() - now.getDay() - 11 * 7);
  twelveWeeksAgo.setHours(0, 0, 0, 0);
  const trendStart = twelveWeeksAgo.toISOString();

  const [userRows, clubRows] = await Promise.all([
    adminClient
      .from("users")
      .select("created_at")
      .gte("created_at", trendStart)
      .order("created_at"),
    adminClient
      .from("clubs")
      .select("created_at")
      .gte("created_at", trendStart)
      .order("created_at"),
  ]);

  // Build week buckets and count in JS
  function buildWeeklyTrend(rows: { data: { created_at: string }[] | null }): { week: string; count: number }[] {
    const buckets = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const ws = new Date(twelveWeeksAgo);
      ws.setDate(ws.getDate() + i * 7);
      buckets.set(ws.toISOString().slice(0, 10), 0);
    }
    const weekStarts = [...buckets.keys()].sort();
    for (const row of rows.data ?? []) {
      const d = new Date(row.created_at);
      // Find which week bucket this belongs to
      for (let i = weekStarts.length - 1; i >= 0; i--) {
        if (d >= new Date(weekStarts[i])) {
          buckets.set(weekStarts[i], (buckets.get(weekStarts[i]) ?? 0) + 1);
          break;
        }
      }
    }
    return weekStarts.map((w) => ({ week: w, count: buckets.get(w) ?? 0 }));
  }

  const userTrend = buildWeeklyTrend(userRows);
  const clubTrend = buildWeeklyTrend(clubRows);

  return NextResponse.json({
    kpi: {
      totalUsers: usersRes.count ?? 0,
      paidUsers: paidRes.count ?? 0,
      totalClubs: clubsRes.count ?? 0,
      practiceThisWeek: practiceRes.count ?? 0,
      newUsersWeek: usersWeekRes.count ?? 0,
      newClubsWeek: clubsWeekRes.count ?? 0,
    },
    trends: { users: userTrend, clubs: clubTrend },
  });
}
