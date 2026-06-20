#!/usr/bin/env node
/**
 * golfnavi-data.json + catalog-data.json (GDO) → Supabase REST API 直接投入
 *
 * Usage:
 *   node scripts/import-golfnavi-api.mjs
 *   node scripts/import-golfnavi-api.mjs --dry-run   # 実行せずに件数確認
 *
 * マージ方針: golfnavi優先、GDO独自アイテムを補完追加
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOLFNAVI_PATH = join(__dirname, "golfnavi-data.json");
const GDO_PATH = join(__dirname, "catalog-data.json");
const DRY_RUN = process.argv.includes("--dry-run");

// ---------- Maker slug mapping ----------

const MAKER_SLUGS = {
  'ピン': 'ping', 'テーラーメイド': 'taylormade', 'キャロウェイ': 'callaway',
  'タイトリスト': 'titleist', 'ブリヂストン': 'bridgestone', 'ミズノ': 'mizuno',
  'ダンロップ': 'dunlop', 'ヤマハ': 'yamaha', 'プロギア': 'prgr',
  'フォーティーン': 'fourteen', 'キャスコ': 'kasco', '本間ゴルフ': 'honma',
  'グローブライド': 'globeride', 'マルマン': 'maruman', 'ヨネックス': 'yonex',
  'ロマロ': 'romaro', 'クリーブランド': 'cleveland', 'オデッセイ': 'odyssey',
  'ウイルソン': 'wilson', 'カタナ': 'katana', 'ロイヤルコレクション': 'royal-collection',
  'マグレガー': 'macgregor', 'リョーマゴルフ': 'ryoma', 'つるやゴルフ': 'tsuruya',
  'エポン': 'epon', 'エナ': 'ena', 'カムイ': 'kamui', 'イオンスポーツ': 'ion-sports',
  'クレイジー': 'crazy', 'ジオテック': 'geotech', '三浦技研': 'miura',
  'jBEAM': 'jbeam', 'SYB': 'syb', 'ジャスティック': 'justick', 'ワークス': 'works',
  'スコッティ・キャメロン': 'scotty-cameron', 'アキラプロダクツ': 'akira',
  'マーベリック': 'maverick',
  'ナイキ': 'nike', 'コブラ': 'cobra', 'YES!Golf': 'yes-golf',
  'ウィンバード': 'winbird', 'パワービルト': 'power-bilt',
  'ネバーコンプロマイズ': 'never-compromise', 'S-YARD': 's-yard',
  'T.P.Mills': 'tp-mills', 'ウイットラム': 'whitlam', 'ベティナルディ': 'bettinardi',
  'クルーズ': 'cruise', 'フォレスタ': 'foresta', 'GTDゴルフ': 'gtd',
  'サソーグラインド': 'saso-grind',
};

// ---------- Maker display names (slug → English name) ----------

const MAKER_DISPLAY_NAMES = {
  'ping': 'PING', 'taylormade': 'TaylorMade', 'callaway': 'Callaway',
  'titleist': 'Titleist', 'bridgestone': 'BRIDGESTONE', 'mizuno': 'Mizuno',
  'dunlop': 'DUNLOP', 'yamaha': 'YAMAHA', 'prgr': 'PRGR',
  'fourteen': 'FOURTEEN', 'kasco': 'KASCO', 'honma': 'HONMA',
  'globeride': 'GLOBERIDE', 'maruman': 'Maruman', 'yonex': 'YONEX',
  'romaro': 'Romaro', 'cleveland': 'Cleveland', 'odyssey': 'Odyssey',
  'wilson': 'Wilson', 'katana': 'KATANA', 'royal-collection': 'Royal Collection',
  'macgregor': 'MacGregor', 'ryoma': 'Ryoma', 'tsuruya': 'Tsuruya',
  'epon': 'EPON', 'ena': 'ENA', 'kamui': 'KAMUI', 'ion-sports': 'ION Sports',
  'crazy': 'CRAZY', 'geotech': 'GEOTECH', 'miura': 'Miura',
  'jbeam': 'jBEAM', 'syb': 'SYB', 'justick': 'Justick', 'works': 'WORKS',
  'scotty-cameron': 'Scotty Cameron', 'akira': 'AKIRA', 'maverick': 'Maverick',
  'nike': 'Nike', 'cobra': 'COBRA', 'yes-golf': 'YES! Golf',
  'winbird': 'Winbird', 'power-bilt': 'Power Bilt',
  'never-compromise': 'Never Compromise', 's-yard': 'S-YARD',
  'tp-mills': 'T.P.Mills', 'whitlam': 'Whitlam', 'bettinardi': 'Bettinardi',
  'cruise': 'CRUISE', 'foresta': 'Foresta', 'gtd': 'GTD', 'saso-grind': 'Saso Grind',
};

// ---------- Spec parsing ----------

const LABEL_KEYWORDS = [
  'スペック概要', '番手', 'ロフト角', 'ライ角', 'バンス角', 'ヘッド体積',
  'クラブ長さ', 'クラブ重量', 'バランス', 'シャフト', 'その他', 'フレックス',
];

function isLabelKeyword(str) {
  if (!str) return false;
  return LABEL_KEYWORDS.some(k => str === k || str.startsWith(k + '(') || str.startsWith(k + '（'));
}

function isBrokenFormat(specs) {
  return specs.some(s => isLabelKeyword(s.club_number));
}

function parseBrokenFormatSpecs(specs) {
  const labelMap = {};
  let currentLabel = null;
  for (const s of specs) {
    const cn = s.club_number;
    if (!cn) continue;
    if (isLabelKeyword(cn)) {
      currentLabel = LABEL_KEYWORDS.find(k => cn === k || cn.startsWith(k + '(') || cn.startsWith(k + '（')) || cn;
      continue;
    }
    if (currentLabel && !['スペック概要', 'シャフト', 'その他', 'フレックス'].includes(currentLabel)) {
      if (!labelMap[currentLabel]) labelMap[currentLabel] = cn;
      currentLabel = null;
    }
  }
  const clubNumberStr = labelMap['番手'];
  if (!clubNumberStr) return [];
  const clubNumbers = clubNumberStr.split(',').map(s => s.trim()).filter(Boolean);
  if (clubNumbers.length === 0) return [];

  function parseValues(str) {
    if (!str) return [];
    const cleaned = str.replace(/[^0-9.,\s~～\-]/g, ' ').trim();
    return cleaned.split(/[,，\s]+/).map(v => { const n = parseFloat(v.trim()); return isNaN(n) ? null : n; });
  }

  const lofts = parseValues(labelMap['ロフト角']);
  const lies = parseValues(labelMap['ライ角']);
  const bounces = parseValues(labelMap['バンス角']);
  const lengths = parseValues(labelMap['クラブ長さ']);
  const weights = parseValues(labelMap['クラブ重量']);
  const volumes = parseValues(labelMap['ヘッド体積']);

  return clubNumbers.map((cn, i) => ({
    club_number: cn, loft: lofts[i] ?? null, lie: lies[i] ?? null,
    bounce: bounces[i] ?? null, length: lengths[i] ?? null,
    weight: weights[i] ?? null, swing_weight: null, head_volume: volumes[i] ?? null,
  }));
}

function parseNormalFormatSpecs(specs) {
  const result = [];
  const seen = new Set();
  for (const s of specs) {
    if (!s.club_number || isLabelKeyword(s.club_number)) continue;
    if (s.loft != null && s.loft > 90) continue;
    if (seen.has(s.club_number)) continue;
    seen.add(s.club_number);
    result.push({
      club_number: s.club_number, loft: s.loft ?? null, lie: s.lie ?? null,
      bounce: s.bounce ?? null, length: s.length ?? null, weight: s.weight ?? null,
      swing_weight: s.swing_weight ?? null, head_volume: s.head_volume ?? null,
    });
  }
  return result;
}

function parseSpecs(specs) {
  if (!specs || specs.length === 0) return [];
  return isBrokenFormat(specs) ? parseBrokenFormatSpecs(specs) : parseNormalFormatSpecs(specs);
}

// ---------- Series slug extraction ----------

function extractSeriesSlug(url) {
  const m = url.match(/\/([^/]+)\.php$/);
  if (!m) return null;
  let slug = m[1];
  slug = slug.replace(/-(driver|fairwaywood|fairway-wood|iron|irons|putter|putters|wedge|wedges|utility|utilities|hybrid|hybrids?)(-\d{4})?$/, '');
  slug = slug.replace(/^\d{4}-/, '');
  return slug || null;
}

// ---------- GDO spec conversion ----------

function convertGdoSpecs(specs) {
  if (!specs || specs.length === 0) return [];
  const seen = new Set();
  const result = [];
  for (const s of specs) {
    const cn = s['番手'] || null;
    const loft = parseFloat(s['ロフト']) || null;
    const lie = parseFloat(s['ライ角']) || null;
    const len = parseFloat(s['長さ']) || null;
    const wt = parseFloat(String(s['総重量'] || '').replace(/約/g, '')) || null;
    const sw = s['バランス'] || null;
    const bounce = parseFloat(s['バウンス']) || null;
    const vol = parseFloat(s['ヘッド体積']) || null;
    const key = cn || `loft-${loft}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      club_number: cn || (loft ? `${loft}°` : '?'),
      loft, lie, bounce, length: len, weight: wt,
      swing_weight: sw && sw !== '-' ? sw : null, head_volume: vol,
    });
  }
  return result;
}

// ---------- Fuzzy name matching ----------

function normalizeName(name) {
  return (name || '')
    .replace(/\s+/g, '')
    .replace(/[（）()「」\[\]・\/\-]/g, '')
    .replace(/ドライバー|フェアウェイウッド|ユーティリティ|アイアン|ウェッジ|パター/g, '')
    .toLowerCase();
}

// ---------- Main ----------

async function main() {
  const golfnavi = JSON.parse(readFileSync(GOLFNAVI_PATH, "utf-8"));
  console.log(`📖 golfnavi: ${golfnavi.length} records`);

  let gdo = [];
  if (existsSync(GDO_PATH)) {
    gdo = JSON.parse(readFileSync(GDO_PATH, "utf-8"));
    console.log(`📖 GDO: ${gdo.length} records`);
  }

  // --- Build model + spec rows ---
  const modelRows = [];
  const specGroups = []; // parallel array: specGroups[i] = specs for modelRows[i]

  let stats = { golfnavi: 0, gdo: 0, gdoSkipped: 0, skippedMaker: 0 };

  // Pass 1: golfnavi
  const golfnaviLookup = {};
  for (const d of golfnavi) {
    const makerSlug = MAKER_SLUGS[d.maker];
    if (!makerSlug) { stats.skippedMaker++; continue; }

    const slug = d.url.split('/').pop().replace('.php', '');
    const seriesSlug = d.seriesSlug || extractSeriesSlug(d.url);

    modelRows.push({
      name: d.name, maker: d.maker, maker_slug: makerSlug,
      slug, series_slug: d.seriesSlug || extractSeriesSlug(d.url),
      category: d.ourCategory, category_slug: d.ourCategory.replace(/_/g, '-'),
      description: d.description || null,
      head_material: d.headMaterial || null, head_finish: d.headFinish || null,
      head_manufacture: d.headManufacture || null, sle_rule: d.sleRule || null,
      price: d.price || null, price_min: d.priceRange?.min || null, price_max: d.priceRange?.max || null,
      release_year: d.releaseYear || null, release_month: d.releaseMonth || null,
      shaft_names: d.shaftNames?.length ? d.shaftNames : null,
      image_url: d.imageUrl || null, source_url: d.url, alpen_pid: null,
      is_visible: true,
    });

    const parsedSpecs = parseSpecs(d.specs);
    specGroups.push(parsedSpecs.map((s, i) => ({ ...s, sort_order: i })));
    stats.golfnavi++;

    // Build lookup for dedup
    const mk = normalizeName(d.maker);
    if (!golfnaviLookup[mk]) golfnaviLookup[mk] = [];
    golfnaviLookup[mk].push(normalizeName(d.name));
  }

  // Pass 2: GDO (supplement)
  for (const d of gdo) {
    const maker = d.brand || d.maker;
    const makerSlug = d.maker_slug || MAKER_SLUGS[maker];
    if (!makerSlug) { stats.skippedMaker++; continue; }

    const makerNorm = normalizeName(maker);
    const nameNorm = normalizeName(d.name);
    const candidates = golfnaviLookup[makerNorm] || [];
    if (candidates.some(c => c === nameNorm || c.includes(nameNorm) || nameNorm.includes(c))) {
      stats.gdoSkipped++;
      continue;
    }

    const cleanShaftNames = (d.shaftNames || []).filter(n =>
      n.length < 50 && !n.includes('。') && !n.includes('です')
    );
    const slug = (d.url || '').split('/').pop()?.replace('.html', '') || '';

    modelRows.push({
      name: d.name, maker, maker_slug: makerSlug,
      slug, series_slug: null,
      category: d.category, category_slug: d.category.replace(/_/g, '-'),
      description: null,
      head_material: d.headMaterial || null, head_finish: null,
      head_manufacture: null, sle_rule: null,
      price: d.price || null, price_min: null, price_max: null,
      release_year: d.releaseYear || null, release_month: null,
      shaft_names: cleanShaftNames.length ? cleanShaftNames : null,
      image_url: null, source_url: d.url || null, alpen_pid: null,
      is_visible: true,
    });

    const parsedSpecs = convertGdoSpecs(d.specs);
    specGroups.push(parsedSpecs.map((s, i) => ({ ...s, sort_order: i })));
    stats.gdo++;
  }

  const totalSpecs = specGroups.reduce((sum, g) => sum + g.length, 0);

  console.log(`\n📊 Stats:`);
  console.log(`  golfnavi: ${stats.golfnavi}`);
  console.log(`  GDO added: ${stats.gdo}`);
  console.log(`  GDO skipped (dup): ${stats.gdoSkipped}`);
  console.log(`  Skipped (unknown maker): ${stats.skippedMaker}`);
  console.log(`  Total models: ${modelRows.length}`);
  console.log(`  Total specs: ${totalSpecs}`);

  if (DRY_RUN) {
    console.log("\n🏁 Dry run complete.");
    return;
  }

  // --- Step 1: Clear existing data ---
  console.log("\n🗑️  Clearing existing data...");
  await supabase.from("catalog_specs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("favorite_clubs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("catalog_models").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("catalog_makers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("  ✅ Done.");

  // --- Step 1.5: Insert catalog_makers ---
  console.log("\n📋 Inserting makers...");
  const uniqueMakerSlugs = [...new Set(modelRows.map(m => m.maker_slug))];
  const makerRows = uniqueMakerSlugs.map((slug, i) => {
    const nameJa = Object.entries(MAKER_SLUGS).find(([, s]) => s === slug)?.[0] ?? slug;
    const nameEn = MAKER_DISPLAY_NAMES[slug] ?? slug;
    return { slug, name: nameEn, name_ja: nameJa, sort_order: i, is_visible: true };
  });
  const { data: insertedMakers, error: makerError } = await supabase
    .from("catalog_makers").insert(makerRows).select("id, slug");
  if (makerError) { console.error("  ❌ Maker insert failed:", makerError.message); process.exit(1); }
  const makerIdMap = Object.fromEntries(insertedMakers.map(m => [m.slug, m.id]));
  console.log(`  ✅ ${insertedMakers.length} makers`);

  // Add maker_id to model rows
  for (const row of modelRows) {
    row.maker_id = makerIdMap[row.maker_slug] ?? null;
  }

  // --- Step 2: Insert models in batches ---
  console.log("\n📋 Inserting models...");
  const MODEL_BATCH = 200;
  const modelIdMap = []; // index → uuid
  let modelErrors = 0;

  for (let i = 0; i < modelRows.length; i += MODEL_BATCH) {
    const batch = modelRows.slice(i, i + MODEL_BATCH);
    const { data, error } = await supabase.from("catalog_models").insert(batch).select("id");
    if (error) {
      console.log(`  ❌ Batch ${i}: ${error.message}`);
      modelErrors++;
      for (let j = 0; j < batch.length; j++) modelIdMap.push(null);
    } else {
      for (const row of data) modelIdMap.push(row.id);
    }
    if ((i + MODEL_BATCH) % 2000 < MODEL_BATCH || i + MODEL_BATCH >= modelRows.length) {
      console.log(`  ${Math.min(i + MODEL_BATCH, modelRows.length)} / ${modelRows.length}`);
    }
  }
  console.log(`  ✅ ${modelIdMap.filter(Boolean).length} models (${modelErrors} errors)`);

  // --- Step 3: Insert specs in batches ---
  console.log("\n📋 Inserting specs...");
  const SPEC_BATCH = 500;
  let specCount = 0;
  let specErrors = 0;

  // Flatten specs with model_id
  const allSpecs = [];
  for (let i = 0; i < specGroups.length; i++) {
    const modelId = modelIdMap[i];
    if (!modelId) continue;
    for (const s of specGroups[i]) {
      allSpecs.push({ model_id: modelId, ...s });
    }
  }

  for (let i = 0; i < allSpecs.length; i += SPEC_BATCH) {
    const batch = allSpecs.slice(i, i + SPEC_BATCH);
    const { error } = await supabase.from("catalog_specs").insert(batch);
    if (error) {
      console.log(`  ❌ Spec batch ${i}: ${error.message}`);
      specErrors++;
    } else {
      specCount += batch.length;
    }
    if ((i + SPEC_BATCH) % 5000 < SPEC_BATCH || i + SPEC_BATCH >= allSpecs.length) {
      console.log(`  ${Math.min(i + SPEC_BATCH, allSpecs.length)} / ${allSpecs.length}`);
    }
  }

  console.log(`\n🏁 Import complete!`);
  console.log(`  Models: ${modelIdMap.filter(Boolean).length}`);
  console.log(`  Specs:  ${specCount}`);
  console.log(`  Errors: ${modelErrors + specErrors}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
