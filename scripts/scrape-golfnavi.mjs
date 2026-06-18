#!/usr/bin/env node
/**
 * golfnavi.info カタログスクレイパー
 *
 * Usage:
 *   node scripts/scrape-golfnavi.mjs --batch=1           # バッチ1 (URL 1-1000)
 *   node scripts/scrape-golfnavi.mjs --batch=2           # バッチ2 (URL 1001-2000)
 *   node scripts/scrape-golfnavi.mjs --batch=1 --maker=ピン  # バッチ1のPINGのみ
 *   node scripts/scrape-golfnavi.mjs --sitemap            # sitemap全件
 *   node scripts/scrape-golfnavi.mjs --category=driver --year=2025  # 年度ベース
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

const SITEMAP_URLS = Array.from({ length: 11 }, (_, i) =>
  i === 0
    ? "https://golfnavi.info/post-sitemap.xml"
    : `https://golfnavi.info/post-sitemap${i + 1}.xml`
);

// ---------- Args ----------

const args = process.argv.slice(2);
const getArg = (name) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : null;
};
const DRY_RUN = args.includes("--dry-run");
const USE_SITEMAP = args.includes("--sitemap");
const BATCH_ID = getArg("batch");       // e.g. --batch=1
const CAT_FILTER = getArg("category");
const YEAR_FILTER = getArg("year");
const MAKER_FILTER = getArg("maker");   // e.g. --maker=ピン

// ---------- Helpers ----------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Scraper: Sitemap-based URL collection ----------

async function collectUrlsFromSitemap(page) {
  const allUrls = new Map(); // url → category

  const catPatterns = {
    driver: /\/cate-driver\//,
    fairway_wood: /\/cate-fairwaywood\//,
    utility: /\/cate-utility\//,
    iron: /\/cate-iron\//,
    wedge: /\/cate-wedge\//,
    putter: /\/cate-putter\//,
  };

  for (const sitemapUrl of SITEMAP_URLS) {
    console.log(`  📋 Sitemap: ${sitemapUrl}`);
    try {
      await page.goto(sitemapUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await sleep(2000);

      const urls = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.match(/https:\/\/golfnavi\.info\/club-cate\/[^\s]+\.php/g) || [];
      });

      for (const url of urls) {
        // Skip ladies pages
        if (url.includes("/ladies/")) continue;

        for (const [cat, pattern] of Object.entries(catPatterns)) {
          if (pattern.test(url)) {
            allUrls.set(url, cat);
            break;
          }
        }
      }

      console.log(`    → ${urls.length} club URLs (${allUrls.size} total)`);
    } catch (e) {
      console.log(`    ❌ ${e.message}`);
    }
  }

  return allUrls;
}

// ---------- Scraper: Product listing (year-based, fallback) ----------

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

    const nameMatch = bodyText.match(/■(.+?)[\n\r]/);
    if (nameMatch) name = nameMatch[1].trim();

    const makerMatch = bodyText.match(/メーカー[：:]\s*(.+?)[\s\n（]/);
    if (makerMatch) maker = makerMatch[1].trim();

    const catMatch = bodyText.match(/種類[：:]\s*(.+?)[\s\n]/);
    if (catMatch) category = catMatch[1].trim();

    const dateMatch = bodyText.match(/発売年月[：:]\s*(\d{4})年(\d{1,2})月/);
    const releaseYear = dateMatch ? parseInt(dateMatch[1], 10) : null;
    const releaseMonth = dateMatch ? parseInt(dateMatch[2], 10) : null;

    // --- Description ---
    let description = null;
    const descEl = document.querySelector(".entry-summary-body");
    if (descEl) description = descEl.textContent.trim().replace(/\s+/g, " ").slice(0, 1000);

    // --- Price ---
    let price = null;
    const priceMatch = bodyText.match(/[￥¥]([\d,]+)\s*[（(]税込/);
    if (priceMatch) price = parseInt(priceMatch[1].replace(/,/g, ""), 10);

    // Price range from table
    let priceRange = null;
    const rangeMatch = bodyText.match(/単品\s*[￥¥]([\d,]+)\s*[〜～]\s*[￥¥]([\d,]+)/);
    if (rangeMatch) priceRange = { min: parseInt(rangeMatch[1].replace(/,/g, "")), max: parseInt(rangeMatch[2].replace(/,/g, "")) };

    // --- Spec overview ---
    let headVolume = null;
    const volMatch = bodyText.match(/ヘッド体積[：:\s]*([\d.]+)\s*cm/);
    if (volMatch) headVolume = parseFloat(volMatch[1]);

    // --- Head materials ---
    const headInfoTable = [...document.querySelectorAll("table")].find((t) =>
      t.textContent.includes("ヘッド素材") || t.textContent.includes("フェース素材")
    );
    const headInfo = {};
    if (headInfoTable) {
      const rows = [...headInfoTable.querySelectorAll("tr")].slice(1);
      for (const row of rows) {
        const cells = [...row.querySelectorAll("th, td")].map((c) => c.textContent.trim().replace(/\s+/g, " "));
        for (let i = 0; i < cells.length - 1; i += 2) {
          if (cells[i] && cells[i + 1] && cells[i + 1] !== "No Data") headInfo[cells[i]] = cells[i + 1];
        }
      }
    }
    const headMaterial = headInfo["ヘッド素材"] || null;
    const faceMaterial = headInfo["フェース素材"] || null;
    const headFinish = headInfo["ヘッド仕上げ"] || null;
    const headManufacture = headInfo["ヘッド製法"] || null;

    // --- SLE rule ---
    const sleMatch = bodyText.match(/SLEルール[：:\s]*(適合|不適合|非適合|不明)/);
    const sleRule = sleMatch ? sleMatch[1] : null;

    // --- Review ---
    const reviewMatch = bodyText.match(/総合点[：:\s]*([\d.]+)点/);
    const reviewCountMatch = bodyText.match(/評価＆レビュー数[：:\s]*(\d+)人/);
    const reviewScore = reviewMatch ? parseFloat(reviewMatch[1]) : null;
    const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1]) : null;

    // --- Image ---
    const ogImage = document.querySelector('meta[property="og:image"]');
    const imageUrl = ogImage?.getAttribute("content") || null;

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
    // Separate table with シャフト名/フレックス/シャフト重量/トルク/キックポイント
    const shaftSpecs = [];
    const shaftSpecTable = [...document.querySelectorAll("table")].find((t) => {
      const text = t.textContent;
      return text.includes("シャフト重量") && text.includes("トルク") && text.includes("キックポイント");
    });
    if (shaftSpecTable) {
      // Skip row 0 (merged), use row 1+
      const rows = [...shaftSpecTable.querySelectorAll("tr")]
        .slice(1)
        .map((tr) =>
          [...tr.querySelectorAll("th, td")].map((c) =>
            c.textContent.trim().replace(/\s+/g, " ")
          )
        )
        .filter((r) => r.length >= 2);

      const specKeys = ["シャフト名", "種類", "フレックス", "シャフト重量", "トルク", "キックポイント"];
      const dataByKey = {};
      for (const row of rows) {
        const key = specKeys.find((k) => row[0]?.includes(k));
        if (key) dataByKey[key] = row.slice(1);
      }

      const names = dataByKey["シャフト名"] || [];
      const flexes = dataByKey["フレックス"] || [];
      const weights = dataByKey["シャフト重量"] || [];
      const torques = dataByKey["トルク"] || [];
      const kicks = dataByKey["キックポイント"] || [];

      const maxLen = Math.max(names.length, flexes.length, weights.length);
      for (let i = 0; i < maxLen; i++) {
        const w = parseFloat((weights[i] || "").replace(/[^0-9.]/g, ""));
        const t = parseFloat((torques[i] || "").replace(/[^0-9.]/g, ""));
        shaftSpecs.push({
          name: names[i] || null,
          flex: flexes[i] || null,
          weight: isNaN(w) ? null : w,
          torque: isNaN(t) ? null : t,
          kickPoint: kicks[i] || null,
        });
      }
    }

    // --- Club specs (per-club number) ---
    // golfnavi uses horizontal tables: row = spec item, column = club number
    // Row 0 is a garbage merged row; row 1+ are real data
    // Some rows (クラブ長さ, クラブ重量, バランス) have shaft name + flex prepended
    const specs = [];
    const specTables = [...document.querySelectorAll("table")].filter((t) => {
      const text = t.textContent;
      return text.includes("番手") && text.includes("ロフト角") && text.includes("ライ角");
    });

    for (const table of specTables) {
      // Skip row 0 (merged garbage), use row 1+ only
      const allRows = [...table.querySelectorAll("tr")];
      const rows = allRows
        .slice(1) // skip first garbage row
        .map((tr) =>
          [...tr.querySelectorAll("th, td")].map((c) =>
            c.textContent.trim().replace(/\s+/g, " ")
          )
        )
        .filter((r) => r.length >= 2);

      if (rows.length < 2) continue;

      // Find row by first cell keyword
      const findRow = (keyword) =>
        rows.find((r) => r[0] && r[0].includes(keyword));

      const clubNumberRow = findRow("番手");
      if (!clubNumberRow || clubNumberRow.length < 2) continue;

      const numClubs = clubNumberRow.length - 1; // first cell is label

      const loftRow = findRow("ロフト角");
      const lieRow = findRow("ライ角");
      const bounceRow = findRow("バンス角") || findRow("バウンス");
      const volumeRow = findRow("ヘッド体積");

      // These rows may have extra shaft/flex cells prepended:
      // e.g. ["クラブ長さ(インチ)", "ALTA J CB BLUE", "46", "46", "46"]
      // We need to align from the RIGHT side to match club columns
      function alignRow(row) {
        if (!row) return null;
        // If row has more cells than clubNumberRow, take last numClubs values
        if (row.length > clubNumberRow.length) {
          return [row[0], ...row.slice(row.length - numClubs)];
        }
        return row;
      }

      const lengthRow = alignRow(findRow("クラブ長さ"));
      const weightRow = alignRow(findRow("クラブ重量"));
      const balanceRow = alignRow(findRow("バランス"));

      const parseNum = (row, i) => {
        if (!row || !row[i]) return null;
        const v = row[i].replace(/[^0-9.-]/g, "");
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
      };

      for (let i = 1; i <= numClubs; i++) {
        const cn = clubNumberRow[i];
        if (!cn || cn === "-") continue;

        specs.push({
          club_number: cn,
          loft: parseNum(loftRow, i),
          lie: parseNum(lieRow, i),
          bounce: parseNum(bounceRow, i),
          length: parseNum(lengthRow, i),
          weight: parseNum(weightRow, i),
          swing_weight: balanceRow?.[i] && balanceRow[i] !== "-" ? balanceRow[i] : null,
          head_volume: parseNum(volumeRow, i),
        });
      }

      if (specs.length > 0) break;
    }

    return {
      name,
      maker,
      category,
      releaseYear,
      releaseMonth,
      description,
      price,
      priceRange,
      headVolume,
      headMaterial,
      faceMaterial,
      headFinish,
      headManufacture,
      sleRule,
      reviewScore,
      reviewCount,
      imageUrl,
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
    `    ✅ ${data.maker || "?"} | ${data.name} | ${data.specs.length} specs | ${data.shaftNames.length} shafts | ${data.releaseYear || "?"}年`
  );

  return { url, ...data };
}

// ---------- Main ----------

async function main() {
  const years = YEAR_FILTER ? [parseInt(YEAR_FILTER, 10)] : DEFAULT_YEARS;
  const categories = CAT_FILTER
    ? { [CAT_FILTER]: CATEGORIES[CAT_FILTER] }
    : CATEGORIES;

  const mode = BATCH_ID ? `BATCH ${BATCH_ID}` : USE_SITEMAP ? "SITEMAP" : "YEAR-BASED";
  console.log("🏌️ golfnavi.info Scraper");
  console.log(`  Mode: ${mode}`);
  if (MAKER_FILTER) console.log(`  Maker filter: ${MAKER_FILTER}`);
  if (!BATCH_ID && !USE_SITEMAP) console.log(`  Categories: ${Object.keys(categories).join(", ")}`);
  if (!BATCH_ID && !USE_SITEMAP) console.log(`  Years: ${years.join(", ")}`);
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

  if (BATCH_ID) {
    // Batch mode: read URLs from golfnavi-urls.json
    const urlsPath = join(__dirname, "golfnavi-urls.json");
    if (!existsSync(urlsPath)) {
      console.error("❌ golfnavi-urls.json not found. Run golfnavi-collect-urls.mjs first.");
      process.exit(1);
    }
    const urlData = JSON.parse(readFileSync(urlsPath, "utf-8"));
    const batchIdx = parseInt(BATCH_ID, 10) - 1;
    if (batchIdx < 0 || batchIdx >= urlData.batches.length) {
      console.error(`❌ Invalid batch ID. Available: 1-${urlData.batches.length}`);
      process.exit(1);
    }
    const batch = urlData.batches[batchIdx];
    console.log(`📦 Batch ${BATCH_ID}: ${batch.count} URLs (${batch.urls[0]?.category} ... ${batch.urls[batch.count - 1]?.category})\n`);

    let count = 0;
    let saved = 0;
    for (const { url: productUrl, category: ourCat } of batch.urls) {
      if (seenUrls.has(productUrl)) {
        count++;
        continue;
      }

      const product = await scrapeProductPage(page, productUrl);
      if (product) {
        if (MAKER_FILTER && product.maker && !product.maker.includes(MAKER_FILTER)) {
          count++;
          continue;
        }
        product.ourCategory = ourCat;
        results.push(product);
        seenUrls.add(productUrl);
        saved++;
      }

      count++;
      if (count % 50 === 0) {
        writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
        console.log(`  💾 Saved (${saved} new, ${results.length} total, ${count}/${batch.count} processed)`);
      }

      await sleep(5000); // 5 second interval for safety
    }

    writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    console.log(`\n💾 Batch ${BATCH_ID} done. ${saved} new products saved.`);

  } else if (USE_SITEMAP) {
    // Sitemap mode: collect all URLs from sitemaps, then scrape
    console.log("📡 Collecting URLs from sitemaps...\n");
    const urlMap = await collectUrlsFromSitemap(page);
    console.log(`\n📦 ${urlMap.size} total club URLs found\n`);

    // Filter by category if specified
    const filtered = CAT_FILTER
      ? [...urlMap.entries()].filter(([, cat]) => cat === CAT_FILTER)
      : [...urlMap.entries()];

    console.log(`📋 ${filtered.length} URLs to scrape${CAT_FILTER ? ` (${CAT_FILTER} only)` : ""}\n`);

    if (DRY_RUN) {
      filtered.forEach(([url, cat]) => console.log(`  ${cat} | ${url}`));
    } else {
      let count = 0;
      for (const [productUrl, ourCat] of filtered) {
        if (seenUrls.has(productUrl)) {
          continue;
        }

        const product = await scrapeProductPage(page, productUrl);
        if (product) {
          // Filter by maker if specified
          if (MAKER_FILTER && product.maker && !product.maker.includes(MAKER_FILTER)) {
            count++;
            continue;
          }
          product.ourCategory = ourCat;
          results.push(product);
          seenUrls.add(productUrl);
        }

        count++;
        if (count % 50 === 0) {
          writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
          console.log(`  💾 Saved (${results.length} total, ${count}/${filtered.length} processed)`);
        }

        await sleep(2500);
      }
    }
  } else {
    // Year-based mode
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

        writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
        console.log(`  💾 Saved (${results.length} total)`);
      }
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
