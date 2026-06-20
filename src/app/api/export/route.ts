import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { supabaseError, withErrorHandler } from "@/lib/api-error";


function escapeCsv(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: Record<string, unknown>[], keys: string[]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(keys.map((k) => escapeCsv(row[k])).join(","));
  }
  return lines.join("\n");
}

const categoryLabels: Record<string, string> = {
  driver: "ドライバー", fairway_wood: "フェアウェイウッド", utility: "ユーティリティ",
  iron: "アイアン", wedge: "ウェッジ", putter: "パター",
};
const statusLabels: Record<string, string> = { bag: "マイバッグ", reserve: "保管庫", sold: "アーカイブ" };
const accessoryCategoryLabels: Record<string, string> = { ball: "ボール", glove: "グローブ", tee: "ティー", other: "その他" };
const accessoryStatusLabels: Record<string, string> = { active: "使用中", past: "アーカイブ" };

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const type = request.nextUrl.searchParams.get("type");

  if (type === "clubs") {
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });
    if (error) return supabaseError(error);

    const rows = (data ?? []).map((c: Record<string, unknown> & { category: string; status: string }) => ({
      ...c,
      category: categoryLabels[c.category] ?? c.category,
      status: statusLabels[c.status] ?? c.status,
    }));

    const csv = toCsv(
      ["種類", "番手", "メーカー", "モデル", "シャフト", "フレックス", "ロフト角", "ライ角", "長さ", "飛距離", "発売年", "ステータス", "購入日", "購入店", "価格", "メモ"],
      rows,
      ["category", "club_number", "maker", "model", "shaft_name", "shaft_flex", "loft", "lie", "length", "distance", "release_year", "status", "purchase_date", "purchase_shop", "purchase_price", "memo"],
    );

    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="waggly-clubs.csv"`,
      },
    });
  }

  if (type === "items") {
    const { data, error } = await supabase
      .from("accessories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return supabaseError(error);

    const rows = (data ?? []).map((a: Record<string, unknown> & { category: string; status: string }) => ({
      ...a,
      category: accessoryCategoryLabels[a.category] ?? a.category,
      status: accessoryStatusLabels[a.status] ?? a.status,
    }));

    const csv = toCsv(
      ["カテゴリ", "ブランド", "モデル", "評価", "ステータス", "メモ", "購入URL"],
      rows,
      ["category", "brand", "model", "rating", "status", "memo", "purchase_url"],
    );

    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="waggly-items.csv"`,
      },
    });
  }

  if (type === "practice") {
    const { data, error } = await supabase
      .from("practice_sessions")
      .select("*, practice_clubs(*, club:clubs(category, club_number, maker, model))")
      .eq("user_id", userId)
      .order("practiced_at", { ascending: false });
    if (error) return supabaseError(error);

    const rows = (data ?? []).map((s: Record<string, unknown> & { practice_clubs?: { balls: number; avg_distance: number | null; club: { maker: string | null; model: string | null; club_number: string } | null }[] }) => {
      const clubDetails = (s.practice_clubs ?? [])
        .map((pc: { balls: number; avg_distance: number | null; club: { maker: string | null; model: string | null; club_number: string } | null }) => {
          const c = pc.club;
          const name = c ? `${c.maker ?? ""}${c.model ? " " + c.model : ""} ${c.club_number}` : "不明";
          return `${name.trim()}:${pc.balls}球${pc.avg_distance ? `(${pc.avg_distance}y)` : ""}`;
        })
        .join(" / ");
      return { ...s, club_details: clubDetails };
    });

    const csv = toCsv(
      ["日付", "場所", "総球数", "評価", "クラブ別", "メモ"],
      rows,
      ["practiced_at", "location", "total_balls", "rating", "club_details", "memo"],
    );

    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="waggly-practice.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid type. Use: clubs, items, practice" }, { status: 400 });
});
