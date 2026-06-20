import Parser from "rss-parser";

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  date: string;
}

const parser = new Parser({ timeout: 5000 });

function extractSource(content: string): string {
  const match = content.match(/<font[^>]*>([^<]+)<\/font>/i);
  return match?.[1]?.trim() ?? "";
}

/**
 * Fetch related news from Google News RSS.
 * query: search terms (e.g. "ゴルフ ドライバー")
 */
export async function fetchRelatedNews(
  query: string,
  limit = 10
): Promise<NewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`ゴルフ ${query}`)}&hl=ja&gl=JP&ceid=JP:ja`;
    const feed = await parser.parseURL(url);

    return (feed.items ?? []).slice(0, limit).map((item) => ({
      title: item.title ?? "",
      url: item.link ?? "",
      source: extractSource(item.content ?? "") || item.creator || "",
      date: item.isoDate ?? item.pubDate ?? "",
    }));
  } catch {
    return [];
  }
}
