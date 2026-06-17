import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { normalizeClubName } from "@/lib/normalize";
import { searchGolfKnowledge } from "@/lib/knowledge/search";
import { searchRakutenClub } from "@/lib/rakuten-search";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { category, club_number, maker, model, shaft_name, shaft_flex, release_year } = await request.json();

  if (!maker || !model) {
    return NextResponse.json({ error: "メーカーとモデルは必須です" }, { status: 400 });
  }

  const makerNorm = normalizeClubName(maker);
  const modelNorm = normalizeClubName(model);
  const admin = getAdminClient();

  // 1. Check cache
  const headQuery = admin
    .from("heads")
    .select("*, configurations:clubs(length, total_weight, swing_weight, shaft_variant_id)")
    .eq("maker_normalized", makerNorm)
    .eq("model_normalized", modelNorm)
    .eq("category", category ?? "");

  if (club_number) {
    headQuery.eq("club_number", club_number);
  } else {
    headQuery.is("club_number", null);
  }

  const { data: cached } = await headQuery.maybeSingle();

  if (cached) {
    // series画像フォールバック: series → spec → null
    let imageUrl = cached.image_url;
    let affiliateUrl = cached.affiliate_url;
    if (cached.series_id && (!imageUrl || !affiliateUrl)) {
      const { data: series } = await admin
        .from("club_models")
        .select("image_url, affiliate_url")
        .eq("id", cached.series_id)
        .single();
      if (series) {
        imageUrl = imageUrl ?? series.image_url;
        affiliateUrl = affiliateUrl ?? series.affiliate_url;
      }
    }
    const defaultConfig = (cached.configurations ?? []).find((c: any) => c.shaft_variant_id === null);
    return NextResponse.json({
      loft: cached.loft,
      lie: cached.lie,
      length: defaultConfig?.length ?? null,
      distance: cached.distance,
      weight: defaultConfig?.total_weight ?? null,
      swing_weight: defaultConfig?.swing_weight ?? null,
      head_volume: cached.head_volume,
      head_weight: cached.head_weight,
      image_url: imageUrl,
      affiliate_url: affiliateUrl,
    });
  }

  // 2. Cache miss — fetch in parallel
  const categoryLabel = CATEGORY_LABELS[category] ?? category ?? "";
  const clubNumberLabel = club_number ? `${club_number}番` : "";
  const searchQuery = `${maker} ${model} ${clubNumberLabel} ${categoryLabel} スペック ロフト角 ライ角 長さ`.trim();

  const [searchResult, rakutenResult] = await Promise.all([
    searchGolfKnowledge(searchQuery).catch(() => ({ results: [], answer: null })),
    searchRakutenClub(maker, model, club_number, category),
  ]);

  // 3. Build prompt with search context
  const hasSearchResults = searchResult.results.length > 0;
  const searchContext = hasSearchResults
    ? searchResult.results.map((r) => `### ${r.title}\n${r.content}`).join("\n\n")
    : "";

  const prompt = hasSearchResults
    ? `以下のWeb検索結果を参考に、ゴルフクラブのスペック情報をJSON形式で回答してください。
注意: 検索結果にはスペック表の一部（別の番手の情報）しか含まれていない場合があります。
指定された番手（${club_number ?? "不明"}）のスペックが検索結果に見つからない場合は、あなたの知識から正確な公開スペック情報を回答してください。
別の番手のスペックを指定された番手のものとして回答しないでください。
該当する情報がない項目はnullにしてください。

## Web検索結果
${searchContext}

## クラブ情報
メーカー: ${maker}
モデル: ${model}
種別: ${categoryLabel || "不明"}
番手: ${club_number ?? "不明"}
シャフト: ${shaft_name ?? "不明"}
フレックス: ${shaft_flex ?? "不明"}
発売年: ${release_year ?? "不明"}

以下のJSON形式で回答してください。JSON以外のテキストは不要です:
\`\`\`json
{
  "loft": ロフト角(数値またはnull),
  "lie": ライ角(数値またはnull),
  "length": 長さインチ(数値またはnull),
  "distance": メーカー公称飛距離またはHS40m/s想定の一般的な飛距離yd(数値またはnull),
  "weight": 総重量g(数値またはnull),
  "swing_weight": バランス("D0","D1","D2"等の文字列またはnull),
  "head_volume": ヘッド体積cc(数値またはnull),
  "head_weight": ヘッド重量g(数値またはnull)
}
\`\`\``
    : `以下のゴルフクラブの公開スペック情報を検索して、JSON形式で回答してください。
分からない項目はnullにしてください。推測ではなく、公開情報に基づいて回答してください。

種別: ${categoryLabel || "不明"}
番手: ${club_number ?? "不明"}
メーカー: ${maker}
モデル: ${model}
シャフト: ${shaft_name ?? "不明"}
フレックス: ${shaft_flex ?? "不明"}
発売年: ${release_year ?? "不明"}

以下のJSON形式で回答してください。JSON以外のテキストは不要です:
\`\`\`json
{
  "loft": ロフト角(数値またはnull),
  "lie": ライ角(数値またはnull),
  "length": 長さインチ(数値またはnull),
  "distance": メーカー公称飛距離またはHS40m/s想定の一般的な飛距離yd(数値またはnull),
  "weight": 総重量g(数値またはnull),
  "swing_weight": バランス("D0","D1","D2"等の文字列またはnull),
  "head_volume": ヘッド体積cc(数値またはnull),
  "head_weight": ヘッド重量g(数値またはnull)
}
\`\`\``;

  try {
    const { text, usage } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
      maxOutputTokens: 300,
    });

    // Save AI usage
    if (usage) {
      await supabase.from("ai_usage").insert({
        user_id: userId,
        input_tokens: usage.inputTokens ?? 0,
        output_tokens: usage.outputTokens ?? 0,
        model: "claude-haiku-4-5",
        source: "autofill",
      });
    }

    // Parse JSON
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
    }

    const jsonStr = jsonMatch[1] ?? jsonMatch[0];
    const specs = JSON.parse(jsonStr);

    // 4. Save to cache — head + default configuration (skip if verified=true)
    const { data: headId, error: headError } = await admin.rpc("upsert_head", {
      p_maker: maker,
      p_model: model,
      p_category: category ?? "",
      p_club_number: club_number ?? null,
      p_maker_normalized: makerNorm,
      p_model_normalized: modelNorm,
      p_loft: specs.loft ?? null,
      p_lie: specs.lie ?? null,
      p_head_volume: specs.head_volume ?? null,
      p_head_weight: specs.head_weight ?? null,
      p_distance: specs.distance ?? null,
      p_image_url: rakutenResult.imageUrl,
      p_affiliate_url: rakutenResult.affiliateUrl,
    });
    if (headError) console.error("[autofill] Head save error:", headError.message);

    // Save configuration (length, weight→total_weight, swing_weight) for shaft_variant_id=null
    if (headId && (specs.length != null || specs.weight != null || specs.swing_weight != null)) {
      const { data: existingConfig } = await admin
        .from("clubs")
        .select("id, verified")
        .eq("head_id", headId)
        .is("shaft_variant_id", null)
        .maybeSingle();

      const configFields = {
        head_id: headId,
        length: specs.length ?? null,
        total_weight: specs.weight ?? null,
        swing_weight: specs.swing_weight ?? null,
        source: "ai" as const,
      };

      if (existingConfig && !existingConfig.verified) {
        await admin.from("clubs").update(configFields).eq("id", existingConfig.id);
      } else if (!existingConfig) {
        await admin.from("clubs").insert(configFields);
      }
      // Skip if existingConfig.verified === true (preserve verified data)
    }

    return NextResponse.json({
      ...specs,
      image_url: rakutenResult.imageUrl,
      affiliate_url: rakutenResult.affiliateUrl,
    });
  } catch (error: any) {
    console.error("[autofill] Error:", error?.message);
    return NextResponse.json({ error: error?.message ?? "Unknown error" }, { status: 500 });
  }
}
