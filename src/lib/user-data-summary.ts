/**
 * Shared helper to get data counts and last updated for a user.
 * Used by conflict-check, resolve-conflict, data-summary, and link APIs.
 */
export async function getUserDataSummary(supabase: any, userId: string) {
  const [clubsRes, practicesRes, accessoriesRes] = await Promise.all([
    supabase.from("clubs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("practice_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("accessories").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  // ユーザーのクラブIDを取得して子テーブルの最終更新を検索
  const { data: userClubs } = await supabase.from("clubs").select("id").eq("user_id", userId);
  const clubIds = (userClubs ?? []).map((c: any) => c.id);

  const baseQueries = [
    supabase.from("clubs").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("practice_sessions").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("accessories").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ];

  const childQueries = clubIds.length > 0 ? [
    supabase.from("club_images").select("created_at").in("club_id", clubIds).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("club_memos").select("created_at").in("club_id", clubIds).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("maintenances").select("created_at").in("club_id", clubIds).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ] : [];

  const results = await Promise.all([...baseQueries, ...childQueries]);

  const dates = results
    .map((r: any) => r.data?.created_at)
    .filter(Boolean) as string[];

  return {
    lastUpdated: dates.length > 0 ? dates.sort().reverse()[0] : null,
    counts: {
      clubs: clubsRes.count ?? 0,
      practices: practicesRes.count ?? 0,
      accessories: accessoriesRes.count ?? 0,
    },
  };
}
