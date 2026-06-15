export interface ParsedPlan {
  title: string;
  summary: string;
  items: {
    club_number: string;
    balls: number;
    focus: string;
    detail?: string;
  }[];
}

export function parsePlanResponse(response: string): ParsedPlan | null {
  // Try ```json ... ``` first
  const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
  // Fallback: raw JSON object
  const rawMatch = response.match(/\{[\s\S]*"items"\s*:\s*\[[\s\S]*\]\s*[\s\S]*\}/);
  const jsonStr = jsonMatch?.[1] ?? rawMatch?.[0];
  if (!jsonStr) return null;

  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.title || !parsed.items || !Array.isArray(parsed.items)) return null;
    return parsed as ParsedPlan;
  } catch {
    return null;
  }
}
