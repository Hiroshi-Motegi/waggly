const RAKUTEN_API = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601";

/**
 * Search Rakuten for a golf club product.
 * Returns image URL and affiliate URL, or nulls on any error.
 * Never throws — caller should treat nulls as "no product info available".
 */
export async function searchRakutenClub(maker: string, model: string, clubNumber?: string | null, category?: string | null): Promise<{
  imageUrl: string | null;
  affiliateUrl: string | null;
}> {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  const affiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;
  if (!appId || !accessKey) return { imageUrl: null, affiliateUrl: null };

  // アイアン/ユーティリティは番手単品で売っていないのでモデル名で検索
  const isSet = category === "iron" || category === "utility";
  const keyword = isSet
    ? `${maker} ${model} ゴルフ`
    : clubNumber
      ? `${maker} ${model} ${clubNumber} ゴルフ`
      : `${maker} ${model} ゴルフクラブ`;
  const params = new URLSearchParams({
    format: "json",
    formatVersion: "2",
    applicationId: appId,
    accessKey,
    keyword,
    hits: "10",
    imageFlag: "1",
    ...(affiliateId ? { affiliateId } : {}),
  });

  const EXCLUDE_WORDS = ["スリーブ", "シャフト単品", "カスタムシャフト", "Custom Shaft", "グリップ単品", "ヘッドカバー"];

  try {
    const res = await fetch(`${RAKUTEN_API}?${params}`, {
      headers: {
        Referer: "https://waggly.jp/",
        Origin: "https://waggly.jp",
        "User-Agent": "Mozilla/5.0 (compatible; Waggly/1.0)",
      },
    });
    if (!res.ok) return { imageUrl: null, affiliateUrl: null };
    const data = await res.json();
    const item = (data.Items ?? []).find(
      (i: any) => !EXCLUDE_WORDS.some((w) => (i.itemName ?? "").includes(w)),
    );
    if (!item) return { imageUrl: null, affiliateUrl: null };

    // 検索結果ページへのアフィリエイトリンク（新品のみ表示）
    const linkKeyword = clubNumber
      ? `${maker} ${model} ${clubNumber} 新品`
      : `${maker} ${model} 新品`;
    const searchKeyword = encodeURIComponent(linkKeyword);
    const searchUrl = `https://search.rakuten.co.jp/search/mall/${searchKeyword}/`;
    const affiliateSearchUrl = affiliateId
      ? `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encodeURIComponent(searchUrl)}`
      : searchUrl;

    return {
      imageUrl: item.mediumImageUrls?.[0] ?? null,
      affiliateUrl: affiliateSearchUrl,
    };
  } catch {
    return { imageUrl: null, affiliateUrl: null };
  }
}
