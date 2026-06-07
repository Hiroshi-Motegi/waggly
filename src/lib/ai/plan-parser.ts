export interface ParsedPlan {
  title: string;
  summary: string;
  items: {
    club_number: string;
    balls: number;
    focus: string;
  }[];
}

export function parsePlanResponse(response: string): ParsedPlan | null {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    if (!parsed.title || !parsed.items || !Array.isArray(parsed.items)) return null;
    return parsed as ParsedPlan;
  } catch {
    return null;
  }
}
