import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchRakutenClub } from "@/lib/rakuten-search";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("club_specs")
    .select("*")
    .order("maker")
    .order("model")
    .order("category")
    .order("club_number");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/admin/specs
 * body: { id, action: "refresh_image" | "refresh_spec" }
 */
export async function PATCH(request: NextRequest) {
  const admin = getAdmin();
  const { id, action } = await request.json();

  const { data: spec } = await admin.from("club_specs").select("*").eq("id", id).single();
  if (!spec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "refresh_image") {
    const result = await searchRakutenClub(spec.maker, spec.model, spec.club_number, spec.category);
    if (result.imageUrl || result.affiliateUrl) {
      await admin.from("club_specs").update({
        image_url: result.imageUrl,
        affiliate_url: result.affiliateUrl,
      }).eq("id", id);
    }
    const { data: updated } = await admin.from("club_specs").select("*").eq("id", id).single();
    return NextResponse.json(updated);
  }

  if (action === "refresh_spec") {
    // Re-run Tavily + Claude extraction
    const { searchGolfKnowledge } = await import("@/lib/knowledge/search");
    const { generateText } = await import("ai");
    const { anthropic } = await import("@ai-sdk/anthropic");

    const CATEGORY_LABELS: Record<string, string> = {
      driver: "ドライバー", fairway_wood: "フェアウェイウッド", utility: "ユーティリティ",
      iron: "アイアン", wedge: "ウェッジ", putter: "パター",
    };
    const categoryLabel = CATEGORY_LABELS[spec.category] ?? spec.category;
    const searchQuery = `${spec.maker} ${spec.model} ${spec.club_number ?? ""} ${categoryLabel} スペック ロフト角 ライ角`.trim();
    const searchResult = await searchGolfKnowledge(searchQuery).catch(() => ({ results: [], answer: null }));
    const searchContext = searchResult.results.map((r: any) => `### ${r.title}\n${r.content}`).join("\n\n");

    const prompt = `以下のWeb検索結果を参考に、ゴルフクラブのスペック情報をJSON形式で回答してください。
指定された番手（${spec.club_number ?? "不明"}）のスペックが検索結果に見つからない場合は、あなたの知識から回答してください。
該当する情報がない項目はnullにしてください。

## Web検索結果
${searchContext}

## クラブ情報
メーカー: ${spec.maker} / モデル: ${spec.model} / 種別: ${categoryLabel} / 番手: ${spec.club_number ?? "不明"}

JSON形式で回答（JSON以外不要）:
\`\`\`json
{"loft":数値orNull,"lie":数値orNull,"length":数値orNull,"distance":数値orNull,"weight":数値orNull,"swing_weight":"文字列orNull","head_volume":数値orNull,"head_weight":数値orNull}
\`\`\``;

    const { text } = await generateText({ model: anthropic("claude-haiku-4-5-20251001"), prompt, maxOutputTokens: 300 });
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Parse failed" }, { status: 500 });
    const specs = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);

    await admin.from("club_specs").update({
      loft: specs.loft ?? null,
      lie: specs.lie ?? null,
      length: specs.length ?? null,
      distance: specs.distance ?? null,
      weight: specs.weight ?? null,
      swing_weight: specs.swing_weight ?? null,
      head_volume: specs.head_volume ?? null,
      head_weight: specs.head_weight ?? null,
    }).eq("id", id);

    const { data: updated } = await admin.from("club_specs").select("*").eq("id", id).single();
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
