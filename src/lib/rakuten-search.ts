const RAKUTEN_API = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706";
const RAKUTEN_GOLF_CLUB_GENRE_ID = "565751";

/**
 * Search Rakuten for a golf club product.
 * Returns image URL and affiliate URL, or nulls on any error.
 * Never throws — caller should treat nulls as "no product info available".
 */
export async function searchRakutenClub(maker: string, model: string): Promise<{
  imageUrl: string | null;
  affiliateUrl: string | null;
}> {
  const appId = process.env.RAKUTEN_APP_ID;
  const affiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;
  if (!appId) return { imageUrl: null, affiliateUrl: null };

  const keyword = `${maker} ${model} ゴルフクラブ`;
  const params = new URLSearchParams({
    format: "json",
    applicationId: appId,
    keyword,
    genreId: RAKUTEN_GOLF_CLUB_GENRE_ID,
    hits: "1",
    imageFlag: "1",
    ...(affiliateId ? { affiliateId } : {}),
  });

  try {
    const res = await fetch(`${RAKUTEN_API}?${params}`);
    if (!res.ok) return { imageUrl: null, affiliateUrl: null };
    const data = await res.json();
    const item = data.Items?.[0]?.Item;
    if (!item) return { imageUrl: null, affiliateUrl: null };

    return {
      imageUrl: item.mediumImageUrls?.[0]?.imageUrl ?? null,
      affiliateUrl: item.affiliateUrl ?? item.itemUrl ?? null,
    };
  } catch {
    return { imageUrl: null, affiliateUrl: null };
  }
}
