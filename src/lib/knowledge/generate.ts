import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { AnalysisTopic } from "./analyze";
import type { SearchResult } from "./search";

export interface GeneratedKnowledge {
  title: string;
  content: string;
  tags: string[];
}

export async function generateKnowledgeItem(
  topic: AnalysisTopic,
  searchResults: SearchResult[],
  searchAnswer: string | null
): Promise<GeneratedKnowledge> {
  const searchContent = searchResults
    .map((r) => `### ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join("\n\n");

  const prompt = `以下のWeb検索結果を元に、ゴルフAIコーチ向けの教師データを作成してください。

## トピック: ${topic.topic}
## 必要な理由: ${topic.reason}
## カテゴリ: ${topic.category}

## Web検索結果
${searchAnswer ? `### AI要約\n${searchAnswer}\n` : ""}
${searchContent}

## 指示
- 正確で実践的な内容にしてください
- アマチュアゴルファーが理解できる言葉で書いてください
- 統計データがあれば出典付きで含めてください
- 適切に改行・段落分けして読みやすくしてください
- 400-800文字程度で

JSON形式のみで出力（コードフェンスなし）:
{
  "title": "タイトル",
  "content": "本文（改行は\\nで表現）",
  "tags": ["タグ1", "タグ2"]
}`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    prompt,
    maxOutputTokens: 1500,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse generation response");
  }

  return JSON.parse(jsonMatch[0]) as GeneratedKnowledge;
}
