import Parser from "rss-parser";

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  date: string;
  imageUrl?: string;
}

const parser = new Parser({ timeout: 5000 });

function extractSource(content: string): string {
  const match = content.match(/<font[^>]*>([^<]+)<\/font>/i);
  return match?.[1]?.trim() ?? "";
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch related news from Google News RSS.
 * query: search terms (e.g. "G440 ドライバー")
 */
export async function fetchRelatedNews(
  query: string,
  limit = 10
): Promise<NewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`ゴルフ ${query}`)}&hl=ja&gl=JP&ceid=JP:ja`;
    const feed = await parser.parseURL(url);

    const items = (feed.items ?? []).slice(0, limit).map((item) => ({
      title: item.title ?? "",
      url: item.link ?? "",
      source: extractSource(item.content ?? "") || item.creator || "",
      date: item.isoDate ?? item.pubDate ?? "",
    }));

    // Fetch OG images in parallel (Google News URL itself has og:image)
    const images = await Promise.all(items.map((item) => fetchOgImage(item.url)));

    return items.map((item, i) => ({ ...item, imageUrl: images[i] ?? undefined }));
  } catch {
    return [];
  }
}
