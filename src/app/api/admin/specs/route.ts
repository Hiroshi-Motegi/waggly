import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchRakutenClub, lookupRakutenUrl } from "@/lib/rakuten-search";
import { normalizeClubName } from "@/lib/normalize";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const admin = getAdmin();
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);
  const sort = url.searchParams.get("sort") ?? "maker";
  const order = url.searchParams.get("order") === "desc" ? false : true;
  const category = url.searchParams.get("category");

  let query = admin
    .from("club_specs")
    .select("*, series:club_spec_series(*)", { count: "exact" });

  if (category) query = query.eq("category", category);

  query = query
    .order(sort, { ascending: order })
    .order("model", { ascending: true })
    .order("club_number", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize });
}

/**
 * PATCH /api/admin/specs
 * body: { id, action: "refresh_image" | "refresh_spec" | "update", data?: Record<string,any> }
 */
export async function PATCH(request: NextRequest) {
  const admin = getAdmin();
  const { id, action, data: updateData } = await request.json();

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
    const { data: updated } = await admin.from("club_specs").select("*, series:club_spec_series(*)").eq("id", id).single();
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

    const { data: updated } = await admin.from("club_specs").select("*, series:club_spec_series(*)").eq("id", id).single();
    return NextResponse.json(updated);
  }

  if (action === "lookup_rakuten" && updateData?.url) {
    const result = await lookupRakutenUrl(updateData.url);
    if (!result.imageUrl && !result.affiliateUrl) {
      return NextResponse.json({ error: "商品が見つかりませんでした" }, { status: 404 });
    }
    const updates: Record<string, any> = {};
    if (result.imageUrl) updates.image_url = result.imageUrl;
    if (result.affiliateUrl) updates.affiliate_url = result.affiliateUrl;
    await admin.from("club_specs").update(updates).eq("id", id);
    const { data: updated } = await admin.from("club_specs").select("*, series:club_spec_series(*)").eq("id", id).single();
    return NextResponse.json(updated);
  }

  if (action === "update" && updateData) {
    const ALLOWED = [
      "maker", "model", "category", "club_number",
      "loft", "lie", "length", "distance", "weight", "swing_weight",
      "head_volume", "head_weight", "image_url", "affiliate_url", "verified", "series_id",
    ];
    const fields: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (key in updateData) fields[key] = updateData[key];
    }
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }
    // Re-normalize if identity fields changed
    if ("maker" in fields) fields.maker_normalized = normalizeClubName(fields.maker);
    if ("model" in fields) fields.model_normalized = normalizeClubName(fields.model);
    // Manual edits mark source as manual
    if (!("verified" in fields)) fields.source = "manual";

    await admin.from("club_specs").update(fields).eq("id", id);
    const { data: updated } = await admin.from("club_specs").select("*, series:club_spec_series(*)").eq("id", id).single();
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
