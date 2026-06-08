import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { checkUsageLimit } from "@/lib/ai/usage-limit";

export async function POST(request: NextRequest) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const withinLimit = await checkUsageLimit(supabase, userId);
  if (!withinLimit) {
    return NextResponse.json({ error: "今月のAI利用上限に達しました" }, { status: 429 });
  }

  const { category, club_number, maker, model, shaft_name, shaft_flex, release_year } = await request.json();

  const prompt = `以下のゴルフクラブの公開スペック情報を検索して、JSON形式で回答してください。
分からない項目はnullにしてください。推測ではなく、公開情報に基づいて回答してください。

種別: ${category ?? "不明"}
番手: ${club_number ?? "不明"}
メーカー: ${maker ?? "不明"}
モデル: ${model ?? "不明"}
シャフト: ${shaft_name ?? "不明"}
フレックス: ${shaft_flex ?? "不明"}
発売年: ${release_year ?? "不明"}

以下のJSON形式で回答してください。JSON以外のテキストは不要です:
\`\`\`json
{
  "loft": ロフト角(数値またはnull),
  "lie": ライ角(数値またはnull),
  "length": 長さインチ(数値またはnull),
  "distance": 一般的な飛距離yd(数値またはnull),
  "weight": 総重量g(数値またはnull),
  "swing_weight": バランス("D0","D1","D2"等の文字列またはnull),
  "head_volume": ヘッド体積cc(数値またはnull),
  "head_weight": ヘッド重量g(数値またはnull)
}
\`\`\``;

  try {
    const { text, usage } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      prompt,
      maxOutputTokens: 300,
    });

    // Save usage
    if (usage) {
      await supabase.from("ai_usage").insert({
        user_id: userId,
        input_tokens: usage.inputTokens ?? 0,
        output_tokens: usage.outputTokens ?? 0,
        model: "claude-sonnet-4-6",
        source: "autofill",
      });
    }

    // Parse JSON from response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
    }

    const jsonStr = jsonMatch[1] ?? jsonMatch[0];
    const specs = JSON.parse(jsonStr);

    return NextResponse.json(specs);
  } catch (error: any) {
    console.error("[autofill] Error:", error?.message);
    return NextResponse.json({ error: error?.message ?? "Unknown error" }, { status: 500 });
  }
}
