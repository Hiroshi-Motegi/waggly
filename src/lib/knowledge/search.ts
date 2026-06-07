import { tavily } from "@tavily/core";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export async function searchGolfKnowledge(query: string): Promise<{
  results: SearchResult[];
  answer: string | null;
}> {
  const response = await client.search(query, {
    searchDepth: "advanced",
    includeAnswer: true,
    maxResults: 5,
  });

  return {
    results: response.results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    })),
    answer: response.answer ?? null,
  };
}
