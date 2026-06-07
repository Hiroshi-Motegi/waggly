import { describe, it, expect } from "vitest";
import { parsePlanResponse } from "@/lib/ai/plan-parser";

describe("parsePlanResponse", () => {
  it("parses valid JSON plan from AI response", () => {
    const response = `ここにテキスト
\`\`\`json
{
  "title": "アイアン精度向上メニュー",
  "summary": "最近ドライバーの練習が多いため、アイアンの精度を上げましょう",
  "items": [
    { "club_number": "7I", "balls": 30, "focus": "距離感重視" },
    { "club_number": "PW", "balls": 20, "focus": "50ydコントロール" }
  ]
}
\`\`\`
追加テキスト`;

    const result = parsePlanResponse(response);

    expect(result).not.toBeNull();
    expect(result!.title).toBe("アイアン精度向上メニュー");
    expect(result!.items).toHaveLength(2);
    expect(result!.items[0].club_number).toBe("7I");
    expect(result!.items[0].balls).toBe(30);
  });

  it("returns null for non-JSON response", () => {
    const result = parsePlanResponse("普通のテキストレスポンス");
    expect(result).toBeNull();
  });
});
