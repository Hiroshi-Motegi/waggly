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

/** Compute sort_order from club_number for natural ordering */
function computeSortOrder(clubNumber: string | null | undefined): number | null {
  if (!clubNumber) return null;
  const cn = clubNumber.trim();
  const upper = cn.toUpperCase();
  // Iron: 4I→4, 5I→5, ...
  if (/^\d+[iI]$/.test(cn)) return parseInt(cn);
  // Wood: 1W→1, 3W→3, ...
  if (/^\d+[wW]$/.test(cn)) return parseInt(cn);
  // Utility/Hybrid: 3U→3, 4H→4, ...
  if (/^\d+[uUhH]$/.test(cn)) return parseInt(cn);
  // Named wedges
  if (upper === "PW") return 100;
  if (upper === "AW" || upper === "GW") return 110;
  if (upper === "SW") return 120;
  if (upper === "LW") return 130;
  if (upper === "UW") return 140;
  // Degree wedges: 48, 50, 52, 56, etc.
  if (/^\d+°?$/.test(cn)) return parseInt(cn) + 100;
  return 999;
}

/** Fetch a single head row with default config flattened for backward-compat */
async function fetchHeadFlat(admin: ReturnType<typeof getAdmin>, id: string) {
  const { data } = await admin
    .from("club_spec_heads")
    .select("*, series:club_spec_series(*), configurations:club_spec_configurations(length, total_weight, swing_weight, shaft_id)")
    .eq("id", id)
    .single();
  if (!data) return null;
  const defaultCfg = (data.configurations ?? []).find((c: any) => c.shaft_id === null);
  const { configurations, ...rest } = data;
  return {
    ...rest,
    length: defaultCfg?.length ?? null,
    total_weight: defaultCfg?.total_weight ?? null,
    swing_weight: defaultCfg?.swing_weight ?? null,
  };
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
    .from("club_spec_heads")
    .select("*, series:club_spec_series(*), configurations:club_spec_configurations(length, total_weight, swing_weight, shaft_id)", { count: "exact" });

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

  // Flatten default configuration into each row
  const flattened = (data ?? []).map((row: any) => {
    const defaultCfg = (row.configurations ?? []).find((c: any) => c.shaft_id === null);
    const { configurations, ...rest } = row;
    return {
      ...rest,
      length: defaultCfg?.length ?? null,
      total_weight: defaultCfg?.total_weight ?? null,
      swing_weight: defaultCfg?.swing_weight ?? null,
    };
  });

  return NextResponse.json({ data: flattened, total: count ?? 0, page, pageSize });
}

/** POST /api/admin/specs — ヘッド新規作成 */
export async function POST(request: NextRequest) {
  const admin = getAdmin();
  const { maker, model, category, club_number, series_id } = await request.json();

  if (!maker || !model || !category) {
    return NextResponse.json({ error: "maker, model, category required" }, { status: 400 });
  }

  // Auto-assign sort_order from club_number
  const sort_order = computeSortOrder(club_number);

  const { data, error } = await admin
    .from("club_spec_heads")
    .insert({
      maker,
      model,
      category,
      club_number: club_number || null,
      maker_normalized: normalizeClubName(maker),
      model_normalized: normalizeClubName(model),
      series_id: series_id || null,
      sort_order,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "既に存在するヘッドスペックです" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/**
 * PATCH /api/admin/specs
 * body: { id, action: "refresh_image" | "refresh_spec" | "update", data?: Record<string,any> }
 */
export async function PATCH(request: NextRequest) {
  const admin = getAdmin();
  const { id, action, data: updateData } = await request.json();

  const { data: spec } = await admin.from("club_spec_heads").select("*").eq("id", id).single();
  if (!spec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "refresh_image") {
    const result = await searchRakutenClub(spec.maker, spec.model, spec.club_number, spec.category);
    if (result.imageUrl || result.affiliateUrl) {
      await admin.from("club_spec_heads").update({
        image_url: result.imageUrl,
        affiliate_url: result.affiliateUrl,
      }).eq("id", id);
    }
    const updated = await fetchHeadFlat(admin, id);
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

    // Head fields go to club_spec_heads
    await admin.from("club_spec_heads").update({
      loft: specs.loft ?? null,
      lie: specs.lie ?? null,
      distance: specs.distance ?? null,
      head_volume: specs.head_volume ?? null,
      head_weight: specs.head_weight ?? null,
    }).eq("id", id);

    // Configuration fields go to club_spec_configurations (default config: shaft_id IS NULL)
    // Cannot use .upsert() — partial unique indexes don't work with onConflict for null shaft_id
    const configFields = {
      length: specs.length ?? null,
      total_weight: specs.weight ?? null,
      swing_weight: specs.swing_weight ?? null,
    };
    const { data: existingConfig } = await admin
      .from("club_spec_configurations")
      .select("id")
      .eq("head_id", id)
      .is("shaft_id", null)
      .maybeSingle();

    if (existingConfig) {
      await admin.from("club_spec_configurations").update(configFields).eq("id", existingConfig.id);
    } else {
      await admin.from("club_spec_configurations").insert({ head_id: id, shaft_id: null, ...configFields });
    }

    const updated = await fetchHeadFlat(admin, id);
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
    await admin.from("club_spec_heads").update(updates).eq("id", id);
    const updated = await fetchHeadFlat(admin, id);
    return NextResponse.json(updated);
  }

  if (action === "update" && updateData) {
    const HEAD_FIELDS = [
      "maker", "model", "category", "club_number", "sort_order",
      "loft", "lie", "distance",
      "head_volume", "head_weight", "image_url", "affiliate_url", "verified", "series_id",
    ];
    const CONFIG_FIELDS = ["length", "total_weight", "swing_weight"];

    const headUpdates: Record<string, any> = {};
    const configUpdates: Record<string, any> = {};

    for (const key of HEAD_FIELDS) {
      if (key in updateData) headUpdates[key] = updateData[key];
    }
    for (const key of CONFIG_FIELDS) {
      if (key in updateData) configUpdates[key] = updateData[key];
    }

    if (Object.keys(headUpdates).length === 0 && Object.keys(configUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    // Update head table
    if (Object.keys(headUpdates).length > 0) {
      // Re-normalize if identity fields changed
      if ("maker" in headUpdates) headUpdates.maker_normalized = normalizeClubName(headUpdates.maker);
      if ("model" in headUpdates) headUpdates.model_normalized = normalizeClubName(headUpdates.model);
      // Manual edits mark source as manual
      if (!("verified" in headUpdates)) headUpdates.source = "manual";

      await admin.from("club_spec_heads").update(headUpdates).eq("id", id);
    }

    // Upsert configuration table for length/total_weight/swing_weight
    // Cannot use .upsert() — partial unique indexes don't work with onConflict for null shaft_id
    if (Object.keys(configUpdates).length > 0) {
      configUpdates.source = "manual";
      const { data: existingCfg } = await admin
        .from("club_spec_configurations")
        .select("id")
        .eq("head_id", id)
        .is("shaft_id", null)
        .maybeSingle();

      if (existingCfg) {
        await admin.from("club_spec_configurations").update(configUpdates).eq("id", existingCfg.id);
      } else {
        await admin.from("club_spec_configurations").insert({ head_id: id, shaft_id: null, ...configUpdates });
      }
    }

    const updated = await fetchHeadFlat(admin, id);
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
