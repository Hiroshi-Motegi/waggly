#!/usr/bin/env node
/**
 * golfnavi.info URL収集
 * sitemapから全クラブページURLを収集してJSONに保存
 *
 * Usage:
 *   node scripts/golfnavi-collect-urls.mjs
 *
 * 出力: scripts/golfnavi-urls.json
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "golfnavi-urls.json");

const SITEMAP_URLS = Array.from({ length: 11 }, (_, i) =>
  i === 0
    ? "https://golfnavi.info/post-sitemap.xml"
    : `https://golfnavi.info/post-sitemap${i + 1}.xml`
);

const CAT_PATTERNS = {
  driver: /\/cate-driver\//,
  fairway_wood: /\/cate-fairwaywood\//,
  utility: /\/cate-utility\//,
  iron: /\/cate-iron\//,
  wedge: /\/cate-wedge\//,
  putter: /\/cate-putter\//,
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("📡 Collecting URLs from golfnavi sitemaps...\n");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const urls = []; // { url, category }

  for (const sitemapUrl of SITEMAP_URLS) {
    console.log(`  📋 ${sitemapUrl}`);
    try {
      await page.goto(sitemapUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await sleep(2000);

      const found = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.match(/https:\/\/golfnavi\.info\/club-cate\/[^\s]+\.php/g) || [];
      });

      for (const url of found) {
        if (url.includes("/ladies/")) continue;

        for (const [cat, pattern] of Object.entries(CAT_PATTERNS)) {
          if (pattern.test(url)) {
            urls.push({ url, category: cat });
            break;
          }
        }
      }

      console.log(`    → ${found.length} club URLs (${urls.length} total)`);
    } catch (e) {
      console.log(`    ❌ ${e.message}`);
    }
  }

  await browser.close();

  // Split into batches of 1000
  const batches = [];
  for (let i = 0; i < urls.length; i += 1000) {
    batches.push(urls.slice(i, i + 1000));
  }

  const output = {
    collectedAt: new Date().toISOString(),
    totalUrls: urls.length,
    batchCount: batches.length,
    batchSize: 1000,
    byCategory: Object.fromEntries(
      Object.keys(CAT_PATTERNS).map((cat) => [
        cat,
        urls.filter((u) => u.category === cat).length,
      ])
    ),
    batches: batches.map((batch, i) => ({
      batchId: i + 1,
      count: batch.length,
      urls: batch,
    })),
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log(`\n✅ Done!`);
  console.log(`  Total: ${urls.length} URLs`);
  console.log(`  Batches: ${batches.length} (1000件/batch)`);
  console.log(`  By category:`);
  for (const [cat, count] of Object.entries(output.byCategory)) {
    console.log(`    ${cat}: ${count}`);
  }
  console.log(`\n  Saved to ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
