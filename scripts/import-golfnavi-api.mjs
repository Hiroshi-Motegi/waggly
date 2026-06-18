#!/usr/bin/env node
/**
 * golfnavi-data.json → Supabase REST API 直接投入
 * import-golfnavi-to-sql.mjs のロジックをAPI版に変換
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const INPUT_PATH = join(__dirname, "golfnavi-data.json");

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
};

// ---------- Spec parsing (from import-golfnavi-to-sql.mjs) ----------

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

// ---------- Main ----------

async function main() {
  const raw = JSON.parse(readFileSync(INPUT_PATH, "utf-8"));
  console.log(`Read ${raw.length} records`);

  // Step 1: Clear existing data (FK-safe order)
  console.log("\n🗑️  Clearing existing data...");
  await supabase.from("catalog_specs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("favorite_clubs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("catalog_models").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("  Done.");

  // Step 2: Build model + spec rows
  const modelRows = [];
  const specRows = [];
  let skipped = 0;

  for (const d of raw) {
    const makerSlug = MAKER_SLUGS[d.maker];
    if (!makerSlug) { skipped++; continue; }

    const slug = d.url.split('/').pop().replace('.php', '');
    const parsedSpecs = parseSpecs(d.specs);

    modelRows.push({
      name: d.name, maker: d.maker, maker_slug: makerSlug, slug,
      category: d.ourCategory, category_slug: d.ourCategory.replace('_', '-'),
      description: d.description || null,
      head_material: d.headMaterial || null, head_finish: d.headFinish || null,
      head_manufacture: d.headManufacture || null, sle_rule: d.sleRule || null,
      price: d.price || null, price_min: d.priceRange?.min || null, price_max: d.priceRange?.max || null,
      release_year: d.releaseYear || null, release_month: d.releaseMonth || null,
      shaft_names: d.shaftNames?.length ? d.shaftNames : null,
      image_url: d.imageUrl || null, source_url: d.url, alpen_pid: null,
    });

    for (let i = 0; i < parsedSpecs.length; i++) {
      specRows.push({ _modelIdx: modelRows.length - 1, ...parsedSpecs[i], sort_order: i });
    }
  }

  console.log(`\n📦 ${modelRows.length} models, ${specRows.length} specs (skipped ${skipped} unknown makers)`);

  // Step 3: Insert models in batches
  console.log("\n📋 Inserting models...");
  const modelIdMap = []; // index → uuid
  let modelErrors = 0;

  for (let i = 0; i < modelRows.length; i += 200) {
    const batch = modelRows.slice(i, i + 200);
    const { data, error } = await supabase.from("catalog_models").insert(batch).select("id");
    if (error) {
      console.log(`  ❌ Batch ${i}: ${error.message}`);
      modelErrors++;
      // Fill with nulls for this batch
      for (let j = 0; j < batch.length; j++) modelIdMap.push(null);
    } else {
      for (const row of data) modelIdMap.push(row.id);
    }
    if ((i + 200) % 1000 === 0 || i + 200 >= modelRows.length) {
      console.log(`  ... ${Math.min(i + 200, modelRows.length)}/${modelRows.length}`);
    }
  }
  console.log(`✅ ${modelIdMap.filter(Boolean).length} models inserted (${modelErrors} batch errors)`);

  // Step 4: Insert specs in batches
  console.log("\n📋 Inserting specs...");
  let specCount = 0;
  let specErrors = 0;

  // Map specs to model IDs
  const specInsertRows = [];
  for (const s of specRows) {
    const modelId = modelIdMap[s._modelIdx];
    if (!modelId) continue;
    const { _modelIdx, ...rest } = s;
    specInsertRows.push({ model_id: modelId, ...rest });
  }

  for (let i = 0; i < specInsertRows.length; i += 500) {
    const batch = specInsertRows.slice(i, i + 500);
    const { error } = await supabase.from("catalog_specs").insert(batch);
    if (error) {
      console.log(`  ❌ Spec batch ${i}: ${error.message}`);
      specErrors++;
    } else {
      specCount += batch.length;
    }
    if ((i + 500) % 2000 === 0 || i + 500 >= specInsertRows.length) {
      console.log(`  ... ${Math.min(i + 500, specInsertRows.length)}/${specInsertRows.length}`);
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`  Models: ${modelIdMap.filter(Boolean).length}`);
  console.log(`  Specs:  ${specCount}`);
  console.log(`  Errors: ${modelErrors + specErrors}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
