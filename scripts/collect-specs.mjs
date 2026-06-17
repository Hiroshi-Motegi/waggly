/**
 * Club specs batch collector.
 *
 * Usage:
 *   node scripts/collect-specs.mjs '[ {"maker":"TaylorMade","model":"Qi10 Max","category":"driver","club_numbers":["1W"]} ]'
 *
 * Or pipe a JSON file:
 *   node scripts/collect-specs.mjs < clubs.json
 *
 * Each entry: { maker, model, category, club_numbers: string[] }
 * If club_numbers is omitted, collects without a specific number (e.g., putters).
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;
const RAKUTEN_AFFILIATE_ID = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;

const CATEGORY_LABELS = {
  driver: "ドライバー",
  fairway_wood: "フェアウェイウッド",
  utility: "ユーティリティ",
  iron: "アイアン",
  wedge: "ウェッジ",
  putter: "パター",
};

function normalize(s) {
  return s.normalize("NFKC").toLowerCase().replace(/\s+/g, "").replace(/[ー−‐]/g, "-");
}

async function searchTavily(query) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      include_answer: true,
      max_results: 5,
    }),
  });
  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

async function extractWithClaude(maker, model, category, clubNumber, searchResults) {
  const categoryLabel = CATEGORY_LABELS[category] ?? category;
  const clubNumberLabel = clubNumber ? `${clubNumber}番` : "";
  const hasResults = searchResults.length > 0;
  const searchContext = hasResults
    ? searchResults.map((r) => `### ${r.title}\n${r.content}`).join("\n\n")
    : "";

  const prompt = hasResults
    ? `以下のWeb検索結果を参考に、ゴルフクラブのスペック情報をJSON形式で回答してください。
注意: 検索結果にはスペック表の一部（別の番手の情報）しか含まれていない場合があります。
指定された番手（${clubNumber ?? "不明"}）のスペックが検索結果に見つからない場合は、あなたの知識から正確な公開スペック情報を回答してください。
別の番手のスペックを指定された番手のものとして回答しないでください。
該当する情報がない項目はnullにしてください。

## Web検索結果
${searchContext}

## クラブ情報
メーカー: ${maker}
モデル: ${model}
種別: ${categoryLabel}
番手: ${clubNumber ?? "不明"}

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
    : `以下のゴルフクラブの公開スペック情報をJSON形式で回答してください。
分からない項目はnullにしてください。推測ではなく、公開情報に基づいて回答してください。

種別: ${categoryLabel}
番手: ${clubNumber ?? "不明"}
メーカー: ${maker}
モデル: ${model}

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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse Claude response");
  return JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
}

const RAKUTEN_ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY;

async function searchRakuten(maker, model, clubNumber, category) {
  if (!RAKUTEN_APP_ID || !RAKUTEN_ACCESS_KEY) return { imageUrl: null, affiliateUrl: null };
  const isSet = category === "iron" || category === "utility";
  const keyword = isSet
    ? `${maker} ${model} ゴルフ`
    : clubNumber
      ? `${maker} ${model} ${clubNumber} ゴルフ`
      : `${maker} ${model} ゴルフクラブ`;
  const EXCLUDE_WORDS = ["スリーブ", "シャフト単品", "カスタムシャフト", "Custom Shaft", "グリップ単品", "ヘッドカバー"];
  const params = new URLSearchParams({
    format: "json",
    formatVersion: "2",
    applicationId: RAKUTEN_APP_ID,
    accessKey: RAKUTEN_ACCESS_KEY,
    keyword,
    hits: "10",
    imageFlag: "1",
    ...(RAKUTEN_AFFILIATE_ID ? { affiliateId: RAKUTEN_AFFILIATE_ID } : {}),
  });
  try {
    const res = await fetch(`https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?${params}`, {
      headers: {
        Referer: "https://waggly.jp/",
        Origin: "https://waggly.jp",
        "User-Agent": "Mozilla/5.0 (compatible; Waggly/1.0)",
      },
    });
    if (!res.ok) return { imageUrl: null, affiliateUrl: null };
    const data = await res.json();
    const item = (data.Items ?? []).find(
      (i) => !EXCLUDE_WORDS.some((w) => (i.itemName ?? "").includes(w)),
    );
    if (!item) return { imageUrl: null, affiliateUrl: null };
    const linkKeyword = clubNumber
      ? `${maker} ${model} ${clubNumber} 新品`
      : `${maker} ${model} 新品`;
    const searchKeyword = encodeURIComponent(linkKeyword);
    const searchUrl = `https://search.rakuten.co.jp/search/mall/${searchKeyword}/`;
    const affiliateSearchUrl = RAKUTEN_AFFILIATE_ID
      ? `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encodeURIComponent(searchUrl)}`
      : searchUrl;

    return {
      imageUrl: item.mediumImageUrls?.[0] ?? null,
      affiliateUrl: affiliateSearchUrl,
    };
  } catch {
    return { imageUrl: null, affiliateUrl: null };
  }
}

async function collectOne(maker, model, category, clubNumber) {
  const makerNorm = normalize(maker);
  const modelNorm = normalize(model);

  // Skip if already cached
  const query = supabase
    .from("heads")
    .select("id")
    .eq("maker_normalized", makerNorm)
    .eq("model_normalized", modelNorm)
    .eq("category", category);
  if (clubNumber) query.eq("club_number", clubNumber);
  else query.is("club_number", null);
  const { data: existing } = await query.maybeSingle();
  if (existing) return "skip";

  // Tavily search
  const categoryLabel = CATEGORY_LABELS[category] ?? category;
  const clubNumberLabel = clubNumber ? `${clubNumber}` : "";
  const searchQuery = `${maker} ${model} ${clubNumberLabel} ${categoryLabel} スペック ロフト角 ライ角 長さ`.trim();
  const searchResults = await searchTavily(searchQuery);

  // Claude extraction
  const specs = await extractWithClaude(maker, model, category, clubNumber, searchResults);

  const rakuten = await searchRakuten(maker, model, clubNumber, category);

  // Upsert head
  const { data: headId, error: headError } = await supabase.rpc("upsert_head", {
    p_maker: maker,
    p_model: model,
    p_category: category,
    p_club_number: clubNumber ?? null,
    p_maker_normalized: makerNorm,
    p_model_normalized: modelNorm,
    p_loft: specs.loft ?? null,
    p_lie: specs.lie ?? null,
    p_head_volume: specs.head_volume ?? null,
    p_head_weight: specs.head_weight ?? null,
    p_distance: specs.distance ?? null,
    p_image_url: rakuten.imageUrl,
    p_affiliate_url: rakuten.affiliateUrl,
  });
  if (headError) throw new Error(`Head upsert error: ${headError.message}`);

  // Save default configuration (shaft_variant_id=null)
  if (headId && (specs.length != null || specs.weight != null || specs.swing_weight != null)) {
    const { data: existingConfig } = await supabase
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
      source: "ai",
    };

    if (existingConfig && !existingConfig.verified) {
      const { error } = await supabase.from("clubs").update(configFields).eq("id", existingConfig.id);
      if (error) console.error(`  WARN  config update: ${error.message}`);
    } else if (!existingConfig) {
      const { error } = await supabase.from("clubs").insert(configFields);
      if (error) console.error(`  WARN  config insert: ${error.message}`);
    }
  }
  return specs;
}

// ─── Main ───
const input = process.argv[2]
  ?? await new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (buf += chunk));
    process.stdin.on("end", () => resolve(buf));
    if (process.stdin.isTTY) resolve("[]");
  });

const clubs = JSON.parse(input);
let collected = 0;
let skipped = 0;
let errors = 0;

for (const club of clubs) {
  const numbers = club.club_numbers ?? [null];
  for (const num of numbers) {
    const label = `${club.maker} ${club.model} ${num ?? ""}`.trim();
    try {
      const result = await collectOne(club.maker, club.model, club.category, num);
      if (result === "skip") {
        console.log(`  SKIP  ${label} (cached)`);
        skipped++;
      } else {
        console.log(`  OK    ${label} loft=${result.loft} lie=${result.lie} len=${result.length}`);
        collected++;
      }
    } catch (e) {
      console.error(`  ERR   ${label}: ${e.message}`);
      errors++;
    }
    // Rate limit: 1 second between API calls
    if (numbers.indexOf(num) < numbers.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  // 2 second pause between models
  await new Promise((r) => setTimeout(r, 2000));
}

console.log(`\nDone: ${collected} collected, ${skipped} skipped, ${errors} errors`);
