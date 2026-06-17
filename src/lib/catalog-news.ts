import Parser from "rss-parser";

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  date: string;
}

const parser = new Parser({ timeout: 5000 });

/**
 * Fetch related news from Google News RSS.
 * query: search terms (e.g. "G440 ドライバー")
 */
export async function fetchRelatedNews(
  query: string,
  limit = 10
): Promise<NewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ja&gl=JP&ceid=JP:ja`;
    const feed = await parser.parseURL(url);

    return (feed.items ?? []).slice(0, limit).map((item) => ({
      title: item.title ?? "",
      url: item.link ?? "",
      source: item.creator ?? item.source ?? "",
      date: item.isoDate ?? item.pubDate ?? "",
    }));
  } catch {
    return [];
  }
}
