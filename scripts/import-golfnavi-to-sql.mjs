#!/usr/bin/env node
/**
 * golfnavi-data.json → SQL 変換スクリプト
 *
 * Usage:
 *   node scripts/import-golfnavi-to-sql.mjs
 *
 * 出力: scripts/import-golfnavi.sql
 *   → Supabase SQL Editor に貼り付けて実行
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_PATH = join(__dirname, "golfnavi-data.json");
const OUTPUT_PATH = join(__dirname, "import-golfnavi.sql");

// ---------- Maker slug mapping ----------

const MAKER_SLUGS = {
  'ピン': 'ping',
  'テーラーメイド': 'taylormade',
  'キャロウェイ': 'callaway',
  'タイトリスト': 'titleist',
  'ブリヂストン': 'bridgestone',
  'ミズノ': 'mizuno',
  'ダンロップ': 'dunlop',
  'ヤマハ': 'yamaha',
  'プロギア': 'prgr',
  'フォーティーン': 'fourteen',
  'キャスコ': 'kasco',
  '本間ゴルフ': 'honma',
  'グローブライド': 'globeride',
  'マルマン': 'maruman',
  'ヨネックス': 'yonex',
  'ロマロ': 'romaro',
  'クリーブランド': 'cleveland',
  'オデッセイ': 'odyssey',
  'ウイルソン': 'wilson',
  'カタナ': 'katana',
  'ロイヤルコレクション': 'royal-collection',
  'マグレガー': 'macgregor',
  'リョーマゴルフ': 'ryoma',
  'つるやゴルフ': 'tsuruya',
  'エポン': 'epon',
  'エナ': 'ena',
  'カムイ': 'kamui',
  'イオンスポーツ': 'ion-sports',
  'クレイジー': 'crazy',
  'ジオテック': 'geotech',
  '三浦技研': 'miura',
  'jBEAM': 'jbeam',
  'SYB': 'syb',
  'ジャスティック': 'justick',
  'ワークス': 'works',
  'スコッティ・キャメロン': 'scotty-cameron',
  'アキラプロダクツ': 'akira',
  'マーベリック': 'maverick',
};

// ---------- Broken format detection ----------

const LABEL_KEYWORDS = [
  'スペック概要', '番手', 'ロフト角', 'ライ角', 'バンス角', 'ヘッド体積',
  'クラブ長さ', 'クラブ重量', 'バランス', 'シャフト', 'その他', 'フレックス',
];

// Also detect partial matches (e.g. "ロフト角(度)")
function isLabelKeyword(str) {
  if (!str) return false;
  return LABEL_KEYWORDS.some(k => str === k || str.startsWith(k + '(') || str.startsWith(k + '（'));
}

function isBrokenFormat(specs) {
  return specs.some(s => isLabelKeyword(s.club_number));
}

// ---------- Spec parsing ----------

/**
 * Parse broken format: alternating label-value pairs.
 * Pattern:
 *   "スペック概要" (skip)
 *   "番手"           → label
 *   "3W, 4W, 5W"    → values (comma-separated club numbers)
 *   "ロフト角"       → label
 *   "15, 16.5, 18度" → values
 *   ...
 *
 * Returns array of spec objects, one per club_number.
 */
function parseBrokenFormatSpecs(specs) {
  // Build label-to-values map
  const labelMap = {};
  let currentLabel = null;

  for (const s of specs) {
    const cn = s.club_number;
    if (!cn) continue;

    if (isLabelKeyword(cn)) {
      // Normalize label: strip "(度)" etc.
      currentLabel = LABEL_KEYWORDS.find(k => cn === k || cn.startsWith(k + '(') || cn.startsWith(k + '（')) || cn;
      continue;
    }

    if (currentLabel && currentLabel !== 'スペック概要' && currentLabel !== 'シャフト' && currentLabel !== 'その他' && currentLabel !== 'フレックス') {
      // This is a value row for the current label
      if (!labelMap[currentLabel]) {
        labelMap[currentLabel] = cn;
      }
      currentLabel = null; // reset after consuming value
    }
  }

  // Parse club numbers
  const clubNumberStr = labelMap['番手'];
  if (!clubNumberStr) return [];

  // Split by comma, clean whitespace
  const clubNumbers = clubNumberStr
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (clubNumbers.length === 0) return [];

  // Parse each field into arrays
  function parseValues(str) {
    if (!str) return [];
    // Remove trailing unit (度, インチ, g, etc.)
    const cleaned = str.replace(/[^0-9.,\s~～\-]/g, ' ').trim();
    // Split by comma or whitespace sequences
    return cleaned.split(/[,，\s]+/).map(v => {
      const n = parseFloat(v.trim());
      return isNaN(n) ? null : n;
    }).filter((v, i) => v !== null || i < clubNumbers.length);
  }

  const loftValues = parseValues(labelMap['ロフト角']);
  const lieValues = parseValues(labelMap['ライ角']);
  const bounceValues = parseValues(labelMap['バンス角']);
  const lengthValues = parseValues(labelMap['クラブ長さ']);
  const weightValues = parseValues(labelMap['クラブ重量']);
  const headVolumeValues = parseValues(labelMap['ヘッド体積']);

  // Build spec rows
  const result = [];
  for (let i = 0; i < clubNumbers.length; i++) {
    result.push({
      club_number: clubNumbers[i],
      loft: loftValues[i] ?? null,
      lie: lieValues[i] ?? null,
      bounce: bounceValues[i] ?? null,
      length: lengthValues[i] ?? null,
      weight: weightValues[i] ?? null,
      swing_weight: null,
      head_volume: headVolumeValues[i] ?? null,
    });
  }

  return result;
}

/**
 * Parse normal format: each row is a club spec with meaningful club_number.
 * Filter out label keyword rows and rows with loft > 90 (corruption).
 */
function parseNormalFormatSpecs(specs) {
  const result = [];
  const seenClubNumbers = new Set();

  for (const s of specs) {
    const cn = s.club_number;
    if (!cn) continue;

    // Skip label keyword rows
    if (isLabelKeyword(cn)) continue;

    // Skip corrupted loft values
    if (s.loft != null && s.loft > 90) continue;

    // Deduplicate by club_number (keep first occurrence)
    if (seenClubNumbers.has(cn)) continue;
    seenClubNumbers.add(cn);

    result.push({
      club_number: cn,
      loft: s.loft ?? null,
      lie: s.lie ?? null,
      bounce: s.bounce ?? null,
      length: s.length ?? null,
      weight: s.weight ?? null,
      swing_weight: s.swing_weight ?? null,
      head_volume: s.head_volume ?? null,
    });
  }

  return result;
}

function parseSpecs(specs) {
  if (!specs || specs.length === 0) return [];
  if (isBrokenFormat(specs)) {
    return parseBrokenFormatSpecs(specs);
  }
  return parseNormalFormatSpecs(specs);
}

// ---------- SQL escaping ----------

function esc(val) {
  if (val == null) return "NULL";
  return "'" + String(val).replace(/\\/g, "\\\\").replace(/'/g, "''") + "'";
}

function escNum(val) {
  if (val == null) return "NULL";
  return String(val);
}

function escTextArray(arr) {
  if (!arr || arr.length === 0) return "NULL";
  const items = arr.map(v => "'" + String(v).replace(/\\/g, "\\\\").replace(/'/g, "''") + "'");
  return "ARRAY[" + items.join(", ") + "]::text[]";
}

// ---------- Main ----------

function main() {
  const raw = JSON.parse(readFileSync(INPUT_PATH, "utf-8"));
  console.log(`Read ${raw.length} records from golfnavi-data.json`);

  // Check for unmapped makers
  const unknownMakers = new Set();
  for (const d of raw) {
    if (!MAKER_SLUGS[d.maker]) {
      unknownMakers.add(d.maker);
    }
  }
  if (unknownMakers.size > 0) {
    console.warn(`WARNING: Unknown makers (will skip): ${[...unknownMakers].join(', ')}`);
  }

  const lines = [];
  lines.push("-- Auto-generated golfnavi import");
  lines.push("-- Generated: " + new Date().toISOString());
  lines.push(`-- Source: golfnavi-data.json (${raw.length} records)`);
  lines.push("");

  // Clear existing data (FK-safe order)
  lines.push("-- Clear existing data (FK-safe order)");
  lines.push("DELETE FROM catalog_specs;");
  lines.push("DELETE FROM favorite_clubs;");
  lines.push("DELETE FROM catalog_models;");
  lines.push("");

  // Collect model rows and spec rows
  const modelRows = [];
  const specRows = [];

  let skippedMaker = 0;
  let brokenCount = 0;
  let normalCount = 0;
  let noSpecsCount = 0;

  for (const d of raw) {
    const makerSlug = MAKER_SLUGS[d.maker];
    if (!makerSlug) {
      skippedMaker++;
      continue;
    }

    // Extract slug from URL
    const slug = d.url.split('/').pop().replace('.php', '');

    // Parse specs
    const parsedSpecs = parseSpecs(d.specs);

    if (d.specs && d.specs.length > 0) {
      if (isBrokenFormat(d.specs)) {
        brokenCount++;
      } else {
        normalCount++;
      }
    } else {
      noSpecsCount++;
    }

    // Generate model UUID
    const modelId = randomUUID();

    modelRows.push({
      id: modelId,
      name: d.name,
      maker: d.maker,
      maker_slug: makerSlug,
      slug,
      category: d.ourCategory,
      description: d.description ?? null,
      head_material: d.headMaterial ?? null,
      head_finish: d.headFinish ?? null,
      head_manufacture: d.headManufacture ?? null,
      sle_rule: d.sleRule ?? null,
      price: d.price ?? null,
      price_min: d.priceRange?.min ?? null,
      price_max: d.priceRange?.max ?? null,
      release_year: d.releaseYear ?? null,
      release_month: d.releaseMonth ?? null,
      shaft_names: d.shaftNames && d.shaftNames.length > 0 ? d.shaftNames : null,
      image_url: d.imageUrl ?? null,
      source_url: d.url,
      alpen_pid: null,
    });

    for (let i = 0; i < parsedSpecs.length; i++) {
      const s = parsedSpecs[i];
      specRows.push({
        model_id: modelId,
        club_number: s.club_number,
        loft: s.loft,
        lie: s.lie,
        bounce: s.bounce,
        length: s.length,
        weight: s.weight,
        swing_weight: s.swing_weight,
        head_volume: s.head_volume,
        sort_order: i,
      });
    }
  }

  console.log(`\nSpec format breakdown:`);
  console.log(`  Broken format: ${brokenCount}`);
  console.log(`  Normal format: ${normalCount}`);
  console.log(`  No specs: ${noSpecsCount}`);
  console.log(`  Skipped (unknown maker): ${skippedMaker}`);

  // Generate Models INSERT in batches of 500 (SQL line length)
  lines.push("-- Models");
  lines.push("INSERT INTO catalog_models (id, name, maker, maker_slug, slug, category, description, head_material, head_finish, price, price_min, price_max, release_year, release_month, shaft_names, head_manufacture, sle_rule, source_url, image_url, alpen_pid)");
  lines.push("VALUES");

  const modelValueLines = modelRows.map(m => {
    const parts = [
      esc(m.id),
      esc(m.name),
      esc(m.maker),
      esc(m.maker_slug),
      esc(m.slug),
      esc(m.category),
      esc(m.description),
      esc(m.head_material),
      esc(m.head_finish),
      escNum(m.price),
      escNum(m.price_min),
      escNum(m.price_max),
      escNum(m.release_year),
      escNum(m.release_month),
      m.shaft_names ? escTextArray(m.shaft_names) : "NULL",
      esc(m.head_manufacture),
      esc(m.sle_rule),
      esc(m.source_url),
      esc(m.image_url),
      "NULL", // alpen_pid
    ];
    return "  (" + parts.join(", ") + ")";
  });

  lines.push(modelValueLines.join(",\n") + ";");
  lines.push("");

  // Generate Specs INSERT in batches (to avoid very long SQL)
  const BATCH_SIZE = 500;
  lines.push("-- Specs");

  if (specRows.length > 0) {
    for (let i = 0; i < specRows.length; i += BATCH_SIZE) {
      const batch = specRows.slice(i, i + BATCH_SIZE);

      lines.push("INSERT INTO catalog_specs (model_id, club_number, loft, lie, bounce, length, weight, swing_weight, head_volume, sort_order)");
      lines.push("VALUES");

      const specValueLines = batch.map(s => {
        const parts = [
          esc(s.model_id),
          esc(s.club_number),
          escNum(s.loft),
          escNum(s.lie),
          escNum(s.bounce),
          escNum(s.length),
          escNum(s.weight),
          esc(s.swing_weight),
          escNum(s.head_volume),
          escNum(s.sort_order),
        ];
        return "  (" + parts.join(", ") + ")";
      });

      lines.push(specValueLines.join(",\n") + ";");
      lines.push("");
    }
  }

  lines.push(`-- Summary: ${modelRows.length} models, ${specRows.length} spec rows`);

  const sql = lines.join("\n");
  writeFileSync(OUTPUT_PATH, sql);

  console.log(`\nGenerated: ${OUTPUT_PATH}`);
  console.log(`  Models: ${modelRows.length}`);
  console.log(`  Spec rows: ${specRows.length}`);
}

main();
