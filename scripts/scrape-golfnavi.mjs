#!/usr/bin/env node
/**
 * golfnavi.info カタログスクレイパー
 *
 * Usage:
 *   node scripts/scrape-golfnavi.mjs                    # 全カテゴリ 2020-2026年
 *   node scripts/scrape-golfnavi.mjs --category=driver  # ドライバーのみ
 *   node scripts/scrape-golfnavi.mjs --year=2025        # 2025年のみ
 *   node scripts/scrape-golfnavi.mjs --dry-run           # URL収集のみ
 *
 * 出力: scripts/golfnavi-data.json
 */

import { chromium } from "playwright";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "golfnavi-data.json");

// ---------- Config ----------

const BASE = "https://golfnavi.info";

const CATEGORIES = {
  driver: "cate-driver",
  fairway_wood: "cate-fairwaywood",
  utility: "cate-utility",
  iron: "cate-iron",
  wedge: "cate-wedge",
  putter: "cate-putter",
};

const DEFAULT_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

// ---------- Args ----------

const args = process.argv.slice(2);
const getArg = (name) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : null;
};
const DRY_RUN = args.includes("--dry-run");
const CAT_FILTER = getArg("category");
const YEAR_FILTER = getArg("year");

// ---------- Helpers ----------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Scraper: Product listing ----------

async function scrapeProductList(page, catSlug, year) {
  const allLinks = [];
  let pageNum = 1;

  while (true) {
    const url =
      pageNum === 1
        ? `${BASE}/club-cate/${catSlug}/?sort_year=${year}`
        : `${BASE}/club-cate/${catSlug}/?sort_year=${year}&page=${pageNum}`;

    console.log(`  📋 ${url}`);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch {
      break;
    }
    await sleep(2000);

    const links = await page.evaluate((slug) => {
      const re = new RegExp(`club-cate/${slug}/[\\w-]+\\.php$`);
      return [...new Set(
        [...document.querySelectorAll("a[href]")]
          .map((a) => a.href)
          .filter((h) => re.test(h))
      )];
    }, catSlug);

    if (links.length === 0) break;

    const newLinks = links.filter((l) => !allLinks.includes(l));
    if (newLinks.length === 0) break;

    allLinks.push(...newLinks);
    pageNum++;

    if (pageNum > 50) break; // safety
  }

  return allLinks;
}

// ---------- Scraper: Product detail ----------

async function scrapeProductPage(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  } catch (e) {
    console.log(`    ❌ Failed: ${e.message}`);
    return null;
  }
  await sleep(2000);

  const data = await page.evaluate(() => {
    const bodyText = document.body.innerText;

    // --- Product info from header table ---
    let name = null;
    let maker = null;
    let category = null;
    let releaseDate = null;

    // Name: look for ■ModelName pattern
    const nameMatch = bodyText.match(/■(.+?)[\n\r]/);
    if (nameMatch) name = nameMatch[1].trim();

    // Maker/category/date from key-value pairs
    const makerMatch = bodyText.match(/メーカー[：:]\s*(.+?)[\s\n（]/);
    if (makerMatch) maker = makerMatch[1].trim();

    const catMatch = bodyText.match(/種類[：:]\s*(.+?)[\s\n]/);
    if (catMatch) category = catMatch[1].trim();

    const dateMatch = bodyText.match(/発売年月[：:]\s*(\d{4})年(\d{1,2})月/);
    const releaseYear = dateMatch ? parseInt(dateMatch[1], 10) : null;

    // --- Description ---
    let description = null;
    const descEl = document.querySelector(".entry-summary-body");
    if (descEl) description = descEl.textContent.trim().replace(/\s+/g, " ").slice(0, 500);

    // --- Price ---
    let price = null;
    const priceMatch = bodyText.match(/[￥¥]([\d,]+)\s*[（(]税込/);
    if (priceMatch) price = parseInt(priceMatch[1].replace(/,/g, ""), 10);

    // --- Spec overview ---
    let headVolume = null;
    const volMatch = bodyText.match(/ヘッド体積[：:\s]*([\d.]+)\s*cm/);
    if (volMatch) headVolume = parseFloat(volMatch[1]);

    // --- Shaft list ---
    const shaftNames = [];
    const shaftTable = [...document.querySelectorAll("table")].find((t) =>
      t.textContent.includes("シャフト名") && t.textContent.includes("フレックス")
    );
    if (shaftTable) {
      const rows = shaftTable.querySelectorAll("tr");
      for (const row of rows) {
        const cells = [...row.querySelectorAll("th, td")].map((c) =>
          c.textContent.trim().replace(/\s+/g, " ")
        );
        if (cells[0] === "シャフト名") {
          cells.slice(1).forEach((s) => {
            if (s && s !== "-") shaftNames.push(s);
          });
        }
      }
    }

    // --- Shaft specs ---
    const shaftSpecs = [];
    if (shaftTable) {
      const rows = [...shaftTable.querySelectorAll("tr")];
      const headers = rows.find((r) => r.textContent.includes("シャフト名"));
      if (headers) {
        const shaftCells = [...headers.querySelectorAll("th, td")].map((c) => c.textContent.trim());
        const dataRows = rows.filter((r) => {
          const first = r.querySelector("th, td")?.textContent.trim() || "";
          return ["フレックス", "シャフト重量", "トルク", "キックポイント"].some((k) => first.includes(k));
        });
        // Build shaft spec objects
        for (const row of dataRows) {
          const cells = [...row.querySelectorAll("th, td")].map((c) => c.textContent.trim());
          const key = cells[0]?.replace(/[（(][^）)]*[）)]/g, "").trim();
          cells.slice(1).forEach((val, idx) => {
            if (!shaftSpecs[idx]) shaftSpecs[idx] = {};
            shaftSpecs[idx][key] = val;
          });
        }
      }
    }

    // --- Club specs (per-club number) ---
    // Find the table with 番手 + ロフト角 rows (横型テーブル)
    const specs = [];
    const specTables = [...document.querySelectorAll("table")].filter((t) => {
      const text = t.textContent;
      return text.includes("番手") && text.includes("ロフト角") && text.includes("ライ角");
    });

    for (const table of specTables) {
      const rows = [...table.querySelectorAll("tr")].map((tr) =>
        [...tr.querySelectorAll("th, td")].map((c) =>
          c.textContent.trim().replace(/\s+/g, " ")
        )
      );

      if (rows.length < 2) continue;

      // Find row indices
      const findRow = (keyword) =>
        rows.find((r) => r[0] && r[0].includes(keyword));

      const clubNumbers = findRow("番手");
      const lofts = findRow("ロフト角");
      const lies = findRow("ライ角");
      const bounces = findRow("バンス角") || findRow("バウンス");
      const lengths = findRow("クラブ長さ");
      const weights = findRow("クラブ重量");
      const balances = findRow("バランス");
      const volumes = findRow("ヘッド体積");

      if (!clubNumbers || clubNumbers.length < 2) continue;

      // Parse each club number column
      for (let i = 1; i < clubNumbers.length; i++) {
        const cn = clubNumbers[i];
        if (!cn || cn === "-") continue;

        const parseNum = (arr) => {
          if (!arr || !arr[i]) return null;
          const v = arr[i].replace(/[^0-9.-]/g, "");
          const n = parseFloat(v);
          return isNaN(n) ? null : n;
        };

        specs.push({
          club_number: cn,
          loft: parseNum(lofts),
          lie: parseNum(lies),
          bounce: parseNum(bounces),
          length: parseNum(lengths),
          weight: parseNum(weights),
          swing_weight: balances?.[i] && balances[i] !== "-" ? balances[i] : null,
          head_volume: parseNum(volumes),
        });
      }

      // Only use first matching spec table
      if (specs.length > 0) break;
    }

    return {
      name,
      maker,
      category,
      releaseYear,
      description,
      price,
      headVolume,
      shaftNames: [...new Set(shaftNames)],
      shaftSpecs,
      specs,
    };
  });

  if (!data || !data.name) {
    console.log(`    ⚠️ No name extracted`);
    return null;
  }

  console.log(
    `    ✅ ${data.maker || "?"} | ${data.name} | ${data.specs.length} specs | ${data.shaftNames.length} shafts`
  );

  return { url, ...data };
}

// ---------- Main ----------

async function main() {
  const years = YEAR_FILTER ? [parseInt(YEAR_FILTER, 10)] : DEFAULT_YEARS;
  const categories = CAT_FILTER
    ? { [CAT_FILTER]: CATEGORIES[CAT_FILTER] }
    : CATEGORIES;

  console.log("🏌️ golfnavi.info Scraper");
  console.log(`  Categories: ${Object.keys(categories).join(", ")}`);
  console.log(`  Years: ${years.join(", ")}`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log();

  // Load existing
  let existing = [];
  if (existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8"));
    console.log(`  Loaded ${existing.length} existing records\n`);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "ja-JP",
  });
  const page = await context.newPage();

  const results = [...existing];
  const seenUrls = new Set(existing.map((r) => r.url));

  for (const [ourCat, catSlug] of Object.entries(categories)) {
    console.log(`\n📂 ${ourCat}`);

    for (const year of years) {
      console.log(`\n  📅 ${year}`);

      const productUrls = await scrapeProductList(page, catSlug, year);
      console.log(`    → ${productUrls.length} products`);

      if (DRY_RUN) {
        productUrls.forEach((u) => console.log(`    ${u}`));
        continue;
      }

      for (const productUrl of productUrls) {
        if (seenUrls.has(productUrl)) {
          console.log(`  ⏭️ Skip: ${productUrl}`);
          continue;
        }

        const product = await scrapeProductPage(page, productUrl);
        if (product) {
          product.ourCategory = ourCat;
          results.push(product);
          seenUrls.add(productUrl);
        }

        await sleep(2500);
      }

      // Save after each year
      writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
      console.log(`  💾 Saved (${results.length} total)`);
    }
  }

  await browser.close();

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\n✅ Done! ${results.length} products saved to ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
