#!/usr/bin/env node
/**
 * catalog-data.json → Supabase 直接投入
 *
 * Usage:
 *   node scripts/import-catalog-direct.mjs
 *   node scripts/import-catalog-direct.mjs --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const DRY_RUN = process.argv.includes("--dry-run");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const INPUT_PATH = join(__dirname, "catalog-data.json");

// ---------- Helpers ----------

function stripCategorySuffix(name) {
  let result = name.trim();
  // Remove trailing year patterns: （2013年）, ＜2024年＞, (2012年モデル)
  result = result.replace(/[（(＜<]\d{4}年[モデル]*[）)＞>]\s*$/, "").trim();
  // Remove category + variant suffixes (order matters: longer first)
  const patterns = [
    / ハイブリッドユーティリティ\s*(?:レディス|ウィメンズ)?$/,
    / ハイブリッド\s*ユーティリティ\s*(?:レディス|ウィメンズ)?$/,
    /ハイブリッドユーティリティ\s*(?:レディス|ウィメンズ)?$/,
    / ユーティリティ\s*(?:アイアン|レディス|ウィメンズ)?\s*$/,
    /ユーティリティ\s*(?:アイアン|レディス|ウィメンズ)?\s*$/,
    / フェアウェイウッド\s*(?:レディス|ウィメンズ)?\s*$/,
    /フェアウェイウッド\s*(?:レディス|ウィメンズ)?\s*$/,
    / ハイブリッド\s*(?:レディス|ウィメンズ)?\s*$/,
    /ハイブリッド\s*(?:レディス|ウィメンズ)?\s*$/,
    / ドライバー\s*(?:レディス|ウィメンズ)?\s*$/,
    /ドライバー\s*(?:レディス|ウィメンズ)?\s*$/,
    / アイアン\s*(?:レディス|ウィメンズ)?\s*$/,
    /アイアン\s*(?:レディス|ウィメンズ)?\s*$/,
    / ウェッジ\s*(?:レディス|ウィメンズ)?\s*$/,
    /ウェッジ\s*(?:レディス|ウィメンズ)?\s*$/,
    / パター\s*(?:レディス|ウィメンズ)?\s*$/,
    /パター\s*(?:レディス|ウィメンズ)?\s*$/,
    / レディス\s*$/,
    / ウィメンズ\s*$/,
  ];
  for (const pat of patterns) {
    if (pat.test(result)) {
      result = result.replace(pat, "").trim();
      break;
    }
  }
  // Also strip category words that appear mid-string (e.g. "DIABLO EDGE ドライバー Black" → "DIABLO EDGE Black")
  result = result
    .replace(/ ドライバー /g, " ")
    .replace(/ フェアウェイウッド /g, " ")
    .replace(/ ユーティリティ /g, " ")
    .replace(/ ハイブリッド /g, " ")
    .replace(/ アイアン /g, " ")
    .replace(/ ウェッジ /g, " ")
    .replace(/ パター /g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return result || name;
}

function slugify(text) {
  let s = text
    .toLowerCase()
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[◆◇★☆●○]/g, "")
    .replace(/[・]/g, "-")
    .replace(/[／/]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  // If slug is empty (all Japanese chars), create a hash from the original text
  if (!s) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    s = "m" + Math.abs(hash).toString(36);
  }
  return s;
}

function parseNum(val) {
  if (val == null || val === "" || val === "—" || val === "-") return null;
  const cleaned = String(val).replace(/^約/, "").replace(/,/g, "");
  if (/可変/.test(cleaned)) return null;
  if (/\//.test(cleaned) && !/^\d/.test(cleaned)) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function mapSpecRow(row, category) {
  let clubNumber = row["番手"] || null;
  if (!clubNumber && row["ロフト"]) {
    const loft = String(row["ロフト"]).replace(/[^0-9.]/g, "");
    if (loft) clubNumber = `${loft}°`;
  }
  if (!clubNumber) return null;

  return {
    club_number: clubNumber,
    loft: parseNum(row["ロフト"]),
    lie: parseNum(row["ライ角"]),
    bounce: parseNum(row["バウンス"] || row["バンス"]),
    length: parseNum(row["長さ"] || row["クラブ長さ"]),
    weight: parseNum(row["総重量"] || row["重量"] || row["重さ"]),
    swing_weight: row["バランス"] || null,
    head_volume: parseNum(row["ヘッド体積"] || row["体積"]),
    head_weight: parseNum(row["ヘッド重量"]),
    face_angle: parseNum(row["フェース角"]),
  };
}

// ---------- Main ----------

async function main() {
  const raw = JSON.parse(readFileSync(INPUT_PATH, "utf-8"));
  const products = raw.filter((p) => p.specs && p.specs.length > 0);
  console.log(`${products.length} products with specs (from ${raw.length} total)`);

  if (DRY_RUN) {
    console.log("DRY RUN — no changes will be made");
  }

  // Step 1: Clean existing data
  if (!DRY_RUN) {
    console.log("\n🗑️  Cleaning existing catalog data...");
    const { error: delErr } = await supabase.from("catalog_specs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) console.log("  specs delete:", delErr.message);
    const { error: delErr2 } = await supabase.from("catalog_models").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr2) console.log("  models delete:", delErr2.message);
    const { error: delErr3 } = await supabase.from("catalog_series").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr3) console.log("  series delete:", delErr3.message);
    console.log("  Done.");
  }

  // Step 2: Group by series
  // Normalize: remove reading-kana parentheticals for grouping key
  // e.g. "B-LD（ビーレディ）チタン" → "B-LD チタン" for key, keep original as display name
  function normalizeForKey(name) {
    return name
      .replace(/[（(][^）)]*[ァ-ヶー]+[^）)]*[）)]/g, "") // remove kana-only parentheticals
      .replace(/[ｰー−–—]/g, "-") // normalize all dash variants to ASCII hyphen
      .replace(/\s+(Black|Red|White|Blue|Green|Silver|Gold|Copper|カッパー|グリーンエディション|ブラック|レッド|ホワイト|シルバー)\s*$/i, "") // strip color variants
      .replace(/\s+/g, " ")
      .trim();
  }

  const seriesMap = new Map();
  for (const product of products) {
    const baseName = stripCategorySuffix(product.name);
    let nameSlug = slugify(baseName);
    const makerSlug = product.maker_slug;

    // Use normalized name as grouping key
    const normalizedName = normalizeForKey(baseName);
    const seriesKey = `${makerSlug}::${normalizedName}`;

    if (!seriesMap.has(seriesKey)) {
      // Ensure name_slug is unique per maker by checking existing
      let finalSlug = nameSlug;
      let counter = 2;
      const usedSlugs = new Set(
        [...seriesMap.values()]
          .filter((s) => s.maker_slug === makerSlug)
          .map((s) => s.name_slug)
      );
      while (usedSlugs.has(finalSlug)) {
        finalSlug = `${nameSlug}-${counter}`;
        counter++;
      }

      seriesMap.set(seriesKey, {
        maker: product.maker,
        maker_slug: makerSlug,
        name: baseName,
        name_slug: finalSlug,
        models: [],
      });
    }

    // Keep the longest display name (with reading kana)
    const series = seriesMap.get(seriesKey);
    if (baseName.length > series.name.length) {
      series.name = baseName;
    }

    series.models.push(product);
  }

  console.log(`\n📦 ${seriesMap.size} series to insert`);

  // Step 3: Insert series
  let seriesCount = 0;
  let modelCount = 0;
  let specCount = 0;
  let errorCount = 0;

  const seriesIdCache = new Map(); // maker_slug::name_slug → id

  // Batch insert series
  const seriesRows = [];
  for (const [key, s] of seriesMap) {
    seriesRows.push({
      maker: s.maker,
      name: s.name,
      maker_slug: s.maker_slug,
      name_slug: s.name_slug,
    });
  }

  if (!DRY_RUN) {
    // Insert in batches of 200
    for (let i = 0; i < seriesRows.length; i += 200) {
      const batch = seriesRows.slice(i, i + 200);
      const { error } = await supabase.from("catalog_series").upsert(batch, {
        onConflict: "maker_slug,name_slug",
      });
      if (error) {
        console.log(`  ❌ Series batch ${i}: ${error.message}`);
        errorCount++;
      }
    }
    seriesCount = seriesRows.length;
    console.log(`✅ ${seriesCount} series inserted`);

    // Fetch all series IDs (paginate to avoid 1000 row limit)
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data: batch } = await supabase
        .from("catalog_series")
        .select("id, maker_slug, name_slug")
        .range(offset, offset + pageSize - 1);
      if (!batch || batch.length === 0) break;
      for (const s of batch) {
        seriesIdCache.set(`${s.maker_slug}::${s.name_slug}`, s.id);
      }
      offset += pageSize;
      if (batch.length < pageSize) break;
    }
    console.log(`  Cached ${seriesIdCache.size} series IDs`);
  }

  // Step 4: Insert models + specs
  console.log("\n📋 Inserting models + specs...");

  let processed = 0;
  for (const [key, series] of seriesMap) {
    const seriesId = seriesIdCache.get(`${series.maker_slug}::${series.name_slug}`);
    if (!seriesId && !DRY_RUN) {
      console.log(`  ⚠️ No series ID for ${series.maker} ${series.name}`);
      continue;
    }

    for (const product of series.models) {
      const categorySlug = product.category.replace("_", "-");
      const baseSlug = slugify(product.name) || categorySlug;
      const modelSlug = `${baseSlug}-${categorySlug}`;

      // Parse specs
      const specs = [];
      const seenClubNumbers = new Set();
      for (const rawSpec of product.specs) {
        const mapped = mapSpecRow(rawSpec, product.category);
        if (!mapped) continue;
        if (seenClubNumbers.has(mapped.club_number)) continue;
        seenClubNumbers.add(mapped.club_number);
        specs.push(mapped);
      }
      if (specs.length === 0) continue;

      if (DRY_RUN) {
        modelCount++;
        specCount += specs.length;
        continue;
      }

      // Insert model
      const { data: modelData, error: modelErr } = await supabase
        .from("catalog_models")
        .insert({
          series_id: seriesId,
          name: product.name,
          category: product.category,
          slug: modelSlug,
          price: product.price || null,
          release_year: product.releaseYear || null,
          head_material: product.headMaterial || null,
          url: product.url || null,
        })
        .select("id")
        .single();

      if (modelErr) {
        errorCount++;
        if (errorCount <= 10) console.log(`  ❌ Model "${product.name}": ${modelErr.message}`);
        continue;
      }

      modelCount++;
      const modelId = modelData.id;

      // Insert specs in batch
      const specRows = specs.map((s, i) => ({
        model_id: modelId,
        club_number: s.club_number,
        loft: s.loft,
        lie: s.lie,
        bounce: s.bounce,
        length: s.length,
        weight: s.weight,
        swing_weight: s.swing_weight,
        head_volume: s.head_volume,
        head_weight: s.head_weight,
        face_angle: s.face_angle,
        sort_order: i,
      }));

      const { error: specErr } = await supabase
        .from("catalog_specs")
        .insert(specRows);

      if (specErr) {
        errorCount++;
        if (errorCount <= 10) console.log(`  ❌ Specs for "${product.name}": ${specErr.message}`);
      } else {
        specCount += specRows.length;
      }

      processed++;
      if (processed % 100 === 0) {
        console.log(`  ... ${processed} models processed (${modelCount} ok, ${errorCount} errors)`);
      }
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`  Series: ${seriesCount}`);
  console.log(`  Models: ${modelCount}`);
  console.log(`  Specs:  ${specCount}`);
  console.log(`  Errors: ${errorCount}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
