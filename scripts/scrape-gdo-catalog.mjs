#!/usr/bin/env node
/**
 * GDO (Golf Digest Online) カタログスクレイパー
 *
 * Usage:
 *   node scripts/scrape-gdo-catalog.mjs              # 全メーカー・全カテゴリ
 *   node scripts/scrape-gdo-catalog.mjs --brand=callaway --category=driver
 *   node scripts/scrape-gdo-catalog.mjs --dry-run    # URLリスト取得のみ
 *   node scripts/scrape-gdo-catalog.mjs --latest      # 最新モデルのみ (2025年以降)
 *
 * 出力: scripts/catalog-data.json
 */

import { chromium } from "playwright";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "catalog-data.json");

// ---------- Config ----------

const BASE = "https://lesson.golfdigest.co.jp";

// GDO genre slugs (URL parameter values)
const GDO_GENRES = {
  driver: "driver",
  fairway_wood: "fw",
  utility: "ut",
  iron: "iron",
  wedge: "wedge",
  putter: "putter",
};

// GDO maker IDs → our DB maker name + maker_slug
const BRANDS = {
  callaway:    { maker: "Callaway",    maker_slug: "callaway",    gdoId: 13 },
  taylormade:  { maker: "TaylorMade",  maker_slug: "taylormade",  gdoId: 19 },
  titleist:    { maker: "Titleist",    maker_slug: "titleist",    gdoId: 16 },
  ping:        { maker: "PING",        maker_slug: "ping",        gdoId: 23 },
  cobra:       { maker: "Cobra",       maker_slug: "cobra",       gdoId: 15 },
  cleveland:   { maker: "Cleveland",   maker_slug: "cleveland",   gdoId: 14 },
  dunlop:      { maker: "Dunlop",      maker_slug: "dunlop",      gdoId: 18 }, // includes Srixon, XXIO
  bridgestone: { maker: "Bridgestone", maker_slug: "bridgestone", gdoId: 29 },
  yamaha:      { maker: "YAMAHA",      maker_slug: "yamaha",      gdoId: 34 },
  honma:       { maker: "HONMA",       maker_slug: "honma",       gdoId: 64 },
  mizuno:      { maker: "Mizuno",      maker_slug: "mizuno",      gdoId: 33 },
  prgr:        { maker: "PRGR",        maker_slug: "prgr",        gdoId: 57 },
};

// ---------- Args ----------

const args = process.argv.slice(2);
const getArg = (name) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : null;
};
const DRY_RUN = args.includes("--dry-run");
const LATEST_ONLY = args.includes("--latest");
const BRAND_FILTER = getArg("brand");
const CATEGORY_FILTER = getArg("category");

// ---------- Helpers ----------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Scraper: Product listing ----------

async function scrapeProductList(page, gdoGenre, gdoMakerId) {
  const allLinks = [];
  let pageNum = 1;

  while (true) {
    const url =
      pageNum === 1
        ? `${BASE}/gear/catalogue/search/?genre=${gdoGenre}&maker=${gdoMakerId}`
        : `${BASE}/gear/catalogue/search/?genre=${gdoGenre}&maker=${gdoMakerId}&page=${pageNum}`;

    console.log(`  📋 Page ${pageNum}: ${url}`);

    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (!resp || resp.status() >= 400) break;
    } catch {
      break;
    }
    await sleep(2000);

    // Collect product links matching /gear/catalogue/{genre}/gca*.html
    const links = await page.evaluate((genre) => {
      const anchors = document.querySelectorAll("a[href]");
      const urls = new Set();
      for (const a of anchors) {
        const href = a.getAttribute("href") || "";
        // Match product detail pages: /gear/catalogue/{category}/gca{id}.html
        if (href.match(/\/gear\/catalogue\/\w+\/gca\d+\.html/)) {
          const full = href.startsWith("http")
            ? href
            : `https://lesson.golfdigest.co.jp${href}`;
          urls.add(full);
        }
      }
      return [...urls];
    }, gdoGenre);

    if (links.length === 0) break;

    const newLinks = links.filter((l) => !allLinks.includes(l));
    if (newLinks.length === 0) break;

    allLinks.push(...newLinks);
    pageNum++;

    // Safety: max 20 pages
    if (pageNum > 20) break;
  }

  console.log(`    → ${allLinks.length} products found`);
  return allLinks;
}

// ---------- Scraper: Product detail page ----------

async function scrapeProductPage(page, url, category) {
  console.log(`  🔍 ${url}`);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000);
  } catch (e) {
    console.log(`    ❌ Failed to load: ${e.message}`);
    return null;
  }

  const data = await page.evaluate(() => {
    // --- Helper ---
    const getText = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.textContent.trim().replace(/\s+/g, " ") : null;
    };
    const getAll = (sel) =>
      [...document.querySelectorAll(sel)].map((el) =>
        el.textContent.trim().replace(/\s+/g, " ")
      );

    // --- Product name ---
    // GDO product pages: h1 or .catalogDetailTtl
    let name = getText("h1");
    if (name && name.length > 200) name = null; // too generic
    if (!name) name = getText(".ttl");
    // Clean up: GDO sometimes appends brand name at the end
    if (name) {
      name = name
        .replace(/\s+(キャロウェイ|テーラーメイド|タイトリスト|ピン|コブラ|クリーブランド|ダンロップ|スリクソン|ゼクシオ|ブリヂストン|ヤマハ|本間ゴルフ|ミズノ|プロギア)\s*$/g, "")
        .trim();
    }

    // --- Brand ---
    // On GDO detail pages, brand is often in a breadcrumb or .catalogDetailBrand
    let brand = getText(".catalogDetailBrand");
    if (!brand) {
      // Try breadcrumb
      const breadcrumbs = getAll("nav a, .breadcrumb a, .pankuzu a");
      brand = breadcrumbs.find((b) =>
        /キャロウェイ|テーラーメイド|タイトリスト|ピン|コブラ|クリーブランド|ダンロップ|スリクソン|ゼクシオ|ブリヂストン|ヤマハ|本間|ミズノ|プロギア/.test(b)
      ) || "";
    }

    // --- Price ---
    const priceEls = getAll("*");
    let price = null;
    for (const t of priceEls) {
      const m = t.match(/(?:税込|税抜)[）)：:\s]*(?:¥|￥)?[\s]*([\d,]+)/);
      if (m) {
        price = parseInt(m[1].replace(/,/g, ""), 10);
        break;
      }
    }
    if (!price) {
      const bodyText = document.body.innerText;
      const m = bodyText.match(/(?:メーカー希望小売)?価格[（(税込)）：:\s]*([\d,]+)/);
      if (m) price = parseInt(m[1].replace(/,/g, ""), 10);
    }

    // --- Release date ---
    const bodyText = document.body.innerText;
    let releaseYear = null;
    // Look for explicit release date patterns
    const yearPatterns = [
      /発売(?:日|予定)?[：:\s]*(20\d{2})年/,
      /(\d{4})年\d{1,2}月(?:\d{1,2}日)?(?:発売|発表)/,
      /(?:発売|発表)[\s：:]*(\d{4})年/,
    ];
    for (const pat of yearPatterns) {
      const m = bodyText.match(pat);
      if (m) {
        releaseYear = parseInt(m[1], 10);
        break;
      }
    }
    // Fallback: check the product name for year like "（2013年）"
    if (!releaseYear && name) {
      const nameYear = name.match(/(\d{4})年/);
      if (nameYear) releaseYear = parseInt(nameYear[1], 10);
    }

    // --- Head volume (ヘッド体積) ---
    let headVolume = null;
    const volMatch = bodyText.match(/(?:ヘッド)?体積[：:\s]*([\d.]+)\s*(?:cc|cm)/i);
    if (volMatch) headVolume = parseFloat(volMatch[1]);

    // --- Head material ---
    let headMaterial = null;
    const matMatch = bodyText.match(
      /(?:フェース|ヘッド)(?:素材|材質)[：:\s]*([^\n]{5,80})/
    );
    if (matMatch) headMaterial = matMatch[1].trim();

    // --- Spec table extraction ---
    // Look for tables with golf spec headers
    const specKeywords = ["ロフト", "ライ角", "長さ", "番手", "バランス", "体積", "総重量", "重さ", "重量"];
    const specs = [];

    const tables = document.querySelectorAll("table");
    for (const table of tables) {
      // Get header row
      const headerRow = table.querySelector("thead tr") || table.querySelector("tr");
      if (!headerRow) continue;

      const headers = [...headerRow.querySelectorAll("th, td")].map((c) =>
        c.textContent.trim().replace(/\s+/g, "")
      );

      // Must have at least one spec keyword
      const matchCount = headers.filter((h) =>
        specKeywords.some((k) => h.includes(k))
      ).length;
      if (matchCount < 2) continue;

      // Parse data rows
      const rows = table.querySelectorAll("tbody tr, tr");
      const startIdx = rows[0] === headerRow ? 1 : 0;

      for (let i = startIdx; i < rows.length; i++) {
        const cells = [...rows[i].querySelectorAll("th, td")].map((c) =>
          c.textContent.trim().replace(/\s+/g, "")
        );
        if (cells.length < 2) continue;

        const row = {};
        cells.forEach((val, j) => {
          if (j < headers.length && val) {
            row[headers[j]] = val;
          }
        });

        // Skip rows that are just sub-headers or empty
        const values = Object.values(row).filter(Boolean);
        if (values.length >= 2) {
          specs.push(row);
        }
      }

      // Only use the first matching spec table; cap at 30 rows to avoid noise
      if (specs.length > 30) specs.length = 30;
      if (specs.length > 0) break;
    }

    // --- Shaft info ---
    // Try to extract shaft names from any "シャフト" labeled sections
    const shaftNames = [];
    const shaftMatch = bodyText.match(/シャフト[名：:\s]*([^\n]+)/g);
    if (shaftMatch) {
      for (const s of shaftMatch) {
        const cleaned = s.replace(/^シャフト[名：:\s]*/, "").trim();
        if (cleaned && cleaned.length < 80 && !cleaned.includes("重量")) {
          shaftNames.push(cleaned);
        }
      }
    }

    return {
      name,
      brand,
      price,
      releaseYear,
      headVolume,
      headMaterial,
      shaftNames: [...new Set(shaftNames)],
      specs,
    };
  });

  if (!data || !data.name) {
    console.log(`    ⚠️ Could not extract product name`);
    return null;
  }

  console.log(
    `    ✅ ${data.brand || "?"} | ${data.name} | ${data.specs.length} spec rows | ${data.releaseYear || "?"}年`
  );

  return { url, category, ...data };
}

// ---------- Main ----------

async function main() {
  console.log("🏌️ GDO Catalog Scraper");
  console.log(`  Brands: ${BRAND_FILTER || "ALL (12 brands)"}`);
  console.log(`  Categories: ${CATEGORY_FILTER || "ALL (6 categories)"}`);
  console.log(`  Latest only: ${LATEST_ONLY}`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log();

  // Load existing data if any
  let existing = [];
  if (existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8"));
    console.log(`  Loaded ${existing.length} existing records\n`);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "ja-JP",
  });
  const page = await context.newPage();

  const results = [...existing];
  const seenUrls = new Set(existing.map((r) => r.url));

  const brands = BRAND_FILTER
    ? { [BRAND_FILTER]: BRANDS[BRAND_FILTER] }
    : BRANDS;

  const categories = CATEGORY_FILTER
    ? { [CATEGORY_FILTER]: GDO_GENRES[CATEGORY_FILTER] }
    : GDO_GENRES;

  for (const [brandSlug, brandInfo] of Object.entries(brands)) {
    if (!brandInfo) {
      console.log(`⚠️ Unknown brand: ${brandSlug}`);
      continue;
    }
    console.log(`\n🏷️  ${brandInfo.maker}`);

    for (const [ourCategory, gdoGenre] of Object.entries(categories)) {
      console.log(`\n  📂 ${ourCategory}`);

      const productUrls = await scrapeProductList(
        page,
        gdoGenre,
        brandInfo.gdoId
      );

      if (DRY_RUN) {
        productUrls.forEach((u) => console.log(`    ${u}`));
        continue;
      }

      for (const productUrl of productUrls) {
        if (seenUrls.has(productUrl)) {
          console.log(`  ⏭️ Skip (already scraped): ${productUrl}`);
          continue;
        }

        const product = await scrapeProductPage(page, productUrl, ourCategory);
        if (product) {
          product.maker = brandInfo.maker;
          product.maker_slug = brandInfo.maker_slug;

          // Skip old models if --latest flag
          if (LATEST_ONLY && product.releaseYear && product.releaseYear < 2025) {
            console.log(`    ⏭️ Skipping old model (${product.releaseYear})`);
            continue;
          }

          results.push(product);
          seenUrls.add(productUrl);
        }

        // Rate limiting - be polite
        await sleep(2500);
      }

      // Save after each category (resume-safe)
      writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
      console.log(`  💾 Saved (${results.length} total)`);
    }
  }

  await browser.close();

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\n✅ Done! ${results.length} total products saved to ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
