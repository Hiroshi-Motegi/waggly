#!/usr/bin/env node
/**
 * golfnavi-data.json のモデルをアルペンで検索し、PIDをマッチングする。
 *
 * Usage:
 *   node scripts/match-alpen-pid.mjs
 *
 * 出力: scripts/alpen-pid-results.json
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OUTPUT = join(__dirname, "alpen-pid-results.json");

const MAKER_SEARCH = {
  "キャロウェイ": "callaway",
  "テーラーメイド": "taylormade",
  "ピン": "PING",
  "タイトリスト": "titleist",
  "ミズノ": "mizuno",
  "本間ゴルフ": "HONMA",
  "プロギア": "PRGR",
  "ダンロップ": "DUNLOP",
  "ブリヂストン": "bridgestone",
  "ヤマハ": "yamaha",
  "フォーティーン": "FOURTEEN",
  "クリーブランド": "cleveland",
  "オデッセイ": "odyssey",
  "マルマン": "maruman",
  "ヨネックス": "yonex",
  "キャスコ": "kasco",
};

const CAT_CODES = {
  "ドライバー": "113001001",
  "フェアウェイウッド": "113001002",
  "ユーティリティ": "113001003",
  "アイアン": "113001004",
  "ウェッジ": "113001005",
  "パター": "113001006",
};

async function searchAlpen(page, maker, modelName, category) {
  const makerSearch = MAKER_SEARCH[maker] || maker;
  const cleanName = modelName
    .replace(/ドライバー|フェアウェイウッド|ユーティリティ|アイアン|ウェッジ|パター/g, "")
    .replace(/^\d{2}['\u2019]?\s*/, "")
    .replace(/^\d{2}\s+/, "")
    .trim();

  const searchQuery = `${makerSearch} ${cleanName}`;
  const catCode = CAT_CODES[category] || "113001";
  const url = `https://store.alpen-group.jp/Form/Product/ProductList.aspx?cat=${catCode}&swrd=${encodeURIComponent(searchQuery)}`;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);

    const result = await page.evaluate(() => {
      const links = [...document.querySelectorAll("a[href*='ProductDetail']")];
      if (links.length === 0) return null;

      const href = links[0].getAttribute("href") || "";
      const pidMatch = href.match(/pid=([^&]+)/);
      if (!pidMatch) return null;

      const nameEl = links[0].closest(".product-item")?.querySelector(".product-name")
        || links[0].querySelector("img")?.getAttribute("alt");

      return {
        pid: pidMatch[1],
        name: typeof nameEl === "string" ? nameEl : nameEl?.textContent?.trim() || "",
      };
    });

    return result;
  } catch {
    return null;
  }
}

const LIMIT = (() => {
  const arg = process.argv.find(a => a.startsWith("--limit="));
  return arg ? parseInt(arg.split("=")[1], 10) : Infinity;
})();

async function main() {
  // DBからalpen_pid未設定のモデルを取得
  console.log("Fetching models from DB...");
  const allModels = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("catalog_models")
      .select("id, name, maker, slug, category")
      .is("alpen_pid", null)
      .order("maker")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allModels.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`${allModels.length} models without alpen_pid`);

  // 中断再開用: 既処理slugをスキップ
  let results = [];
  if (existsSync(OUTPUT)) {
    results = JSON.parse(readFileSync(OUTPUT, "utf-8"));
    console.log(`Resuming: ${results.length} already processed`);
  }
  const done = new Set(results.map((r) => r.slug));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let matched = 0;
  let processed = 0;

  for (let i = 0; i < allModels.length; i++) {
    const m = allModels[i];
    if (done.has(m.slug)) continue;

    const result = await searchAlpen(page, m.maker, m.name, m.category);

    results.push({
      model_name: m.name,
      maker: m.maker,
      slug: m.slug,
      alpen_pid: result?.pid || null,
      alpen_product_name: result?.name || null,
    });

    // マッチしたら即DBにUPDATE
    if (result?.pid) {
      matched++;
      const { error } = await supabase
        .from("catalog_models")
        .update({ alpen_pid: result.pid })
        .eq("id", m.id);
      if (error) console.log(`  ❌ UPDATE ${m.slug}: ${error.message}`);
    }

    processed++;
    if (processed >= LIMIT) break;
    if (processed % 50 === 0) {
      writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
      console.log(`Progress: ${processed}/${allModels.length} (matched: ${matched})`);
    }

    await page.waitForTimeout(800);
  }

  await browser.close();
  writeFileSync(OUTPUT, JSON.stringify(results, null, 2));

  console.log(`\nDone: ${processed} processed, ${matched} matched (${processed > 0 ? ((matched / processed) * 100).toFixed(1) : 0}%)`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
