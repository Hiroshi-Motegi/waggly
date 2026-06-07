/**
 * Affiliate URL converter.
 * Set environment variables to enable:
 *   NEXT_PUBLIC_AMAZON_ASSOCIATE_ID=your-tag-20
 *   NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID=your-rakuten-id
 */

const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_ID;
const RAKUTEN_ID = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID;

export function toAffiliateUrl(url: string): string {
  if (!url) return url;

  try {
    const parsed = new URL(url);

    // Amazon
    if (
      AMAZON_TAG &&
      (parsed.hostname.includes("amazon.co.jp") ||
        parsed.hostname.includes("amazon.com") ||
        parsed.hostname.includes("amzn.to") ||
        parsed.hostname.includes("amzn.asia"))
    ) {
      parsed.searchParams.set("tag", AMAZON_TAG);
      return parsed.toString();
    }

    // Rakuten
    if (
      RAKUTEN_ID &&
      (parsed.hostname.includes("rakuten.co.jp") ||
        parsed.hostname.includes("item.rakuten.co.jp"))
    ) {
      // Rakuten affiliate uses a redirect URL format
      return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_ID}/?pc=${encodeURIComponent(url)}`;
    }

    // Other URLs: return as-is
    return url;
  } catch {
    // Invalid URL: return as-is
    return url;
  }
}

/**
 * Check if URL is from a supported affiliate platform
 */
export function getUrlPlatform(url: string): "amazon" | "rakuten" | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.includes("amazon.co.jp") ||
      parsed.hostname.includes("amazon.com") ||
      parsed.hostname.includes("amzn.to") ||
      parsed.hostname.includes("amzn.asia")
    ) return "amazon";
    if (
      parsed.hostname.includes("rakuten.co.jp") ||
      parsed.hostname.includes("item.rakuten.co.jp")
    ) return "rakuten";
    return null;
  } catch {
    return null;
  }
}
