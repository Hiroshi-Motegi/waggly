import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { AnonymousSessionData, AnonymousPlanData } from "./anonymize";

export interface AnalysisTopic {
  topic: string;
  reason: string;
  category: string;
  search_query: string;
}

export interface AnalysisResult {
  summary: string;
  topics: AnalysisTopic[];
}

export async function analyzeKnowledgeGaps(
  sessions: AnonymousSessionData,
  plans: AnonymousPlanData,
  existingTitles: string[]
): Promise<AnalysisResult> {
  const prompt = `あなたはゴルフ教育の専門家です。
以下の匿名練習データを分析し、AIゴルフコーチの知識ベースに追加すべきトピックを提案してください。

## 今週の練習データ（匿名）
- 練習記録数: ${sessions.total_count}件
- 平均評価: ${sessions.avg_rating ?? "なし"}
- よく練習された番手: ${sessions.top_clubs.map((c) => `${c.club_number}(${c.total_balls}球)`).join(", ") || "なし"}
- 低評価の練習メモ:
${sessions.low_rated_memos.map((m) => `  - ${m}`).join("\n") || "  なし"}
- その他のメモ（抜粋）:
${sessions.memos.slice(0, 10).map((m) => `  - ${m}`).join("\n") || "  なし"}

## プラン評価データ（匿名）
- 評価済みプラン数: ${plans.total_count}件
- 高評価プラン（★4-5）: ${plans.high_rated.map((p) => `${p.title}(★${p.rating})`).join(", ") || "なし"}
- 低評価プラン（★1-2）: ${plans.low_rated.map((p) => `${p.title}(★${p.rating})`).join(", ") || "なし"}
- ユーザーのコメント:
${plans.comments.map((c) => `  - ${c}`).join("\n") || "  なし"}

## 既存の教師データ（タイトル一覧）
${existingTitles.map((t) => `- ${t}`).join("\n") || "なし"}

## 指示
- 既存データと重複しないトピックを最大5件提案してください
- 各トピックについて、なぜ必要かの理由と、Web検索用のクエリを含めてください
- カテゴリは以下から選択: swing_basics, pga_data, drill, equipment, mental, course_strategy, fitness, rules
- データが少ない場合は、一般的なアマチュアゴルファーに役立つ基礎知識を提案してください

JSON形式のみで出力（コードフェンスなし）:
{
  "summary": "今週の傾向を1-2文で",
  "topics": [
    {
      "topic": "トピック名",
      "reason": "なぜこの知識が必要か",
      "category": "カテゴリ",
      "search_query": "ゴルフ ○○ ドリル 練習方法"
    }
  ]
}`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    prompt,
    maxOutputTokens: 1500,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse analysis response");
  }

  return JSON.parse(jsonMatch[0]) as AnalysisResult;
}
