import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { analyzeGaps } from "@/lib/gap-analysis";
import { parsePlanResponse } from "@/lib/ai/plan-parser";

export async function POST(request: Request) {
  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  const { source } = await request.json();

  // Fetch context data
  const [clubsRes, sessionsRes, plansRes] = await Promise.all([
    supabase.from("clubs").select("*").eq("user_id", userId).eq("status", "active").order("sort_order"),
    supabase.from("practice_sessions")
      .select("*, practice_clubs(*, club:clubs(club_number))")
      .eq("user_id", userId)
      .order("practiced_at", { ascending: false })
      .limit(10),
    supabase.from("practice_plans")
      .select("title, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const clubs = clubsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const plans = plansRes.data ?? [];
  const gapAnalysis = analyzeGaps(clubs);

  const systemPrompt = buildSystemPrompt({
    clubs: clubs.map((c: any) => ({
      club_number: c.club_number, maker: c.maker, model: c.model,
      shaft_name: c.shaft_name, distance: c.distance,
    })),
    recentSessions: sessions.map((s: any) => ({
      practiced_at: s.practiced_at, total_balls: s.total_balls, memo: s.memo,
      clubs: (s.practice_clubs ?? []).map((pc: any) => ({
        club_number: pc.club?.club_number ?? "?", balls: pc.balls,
      })),
    })),
    recentPlans: plans.map((p: any) => ({
      title: p.title, status: p.status, created_at: p.created_at,
    })),
    gapAnalysis,
  });

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    prompt: `ユーザーの練習記録とクラブセットを分析して、次の練習メニューを提案してください。
合計球数は100〜200球程度にしてください。
以下のJSON形式で出力してください:

\`\`\`json
{
  "title": "提案タイトル",
  "summary": "提案の概要と理由",
  "items": [
    { "club_number": "番手名", "balls": 球数, "focus": "練習のポイント" }
  ]
}
\`\`\``,
    maxOutputTokens: 1000,
  });

  const parsed = parsePlanResponse(text);
  if (!parsed) {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  // Save plan
  const { data: plan, error: planError } = await supabase
    .from("practice_plans")
    .insert({
      user_id: userId,
      title: parsed.title,
      summary: parsed.summary,
      source: source ?? "auto",
    })
    .select()
    .single();

  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 });

  // Match club_number to club_id and save items
  const items = parsed.items.map((item, i) => {
    const matchedClub = clubs.find((c: any) => c.club_number === item.club_number);
    return {
      plan_id: plan.id,
      club_id: matchedClub?.id ?? null,
      balls: item.balls,
      focus: item.focus,
      sort_order: i,
    };
  });

  await supabase.from("practice_plan_items").insert(items);

  // Fetch complete plan with items
  const { data: completePlan } = await supabase
    .from("practice_plans")
    .select("*, practice_plan_items(*, club:clubs(id, club_number))")
    .eq("id", plan.id)
    .single();

  return NextResponse.json(completePlan, { status: 201 });
}
