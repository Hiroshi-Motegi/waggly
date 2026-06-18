import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getApiAuth, unauthorized } from "@/lib/supabase/api";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";

import { analyzeGaps } from "@/lib/gap-analysis";
import { parsePlanResponse } from "@/lib/ai/plan-parser";
import { incrementUsageCounter, decrementUsageCounter } from "@/lib/ai/usage-counter";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const { allowed } = await checkRateLimit(`plan:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "リクエストが多すぎます。しばらく待ってからお試しください。" }, { status: 429 });
  }

  const auth = await getApiAuth();
  if (!auth) return unauthorized();
  const { supabase, userId } = auth;

  // Check usage limit (atomic increment)
  const usageCount = await incrementUsageCounter(userId, "plan");
  if (usageCount === null) {
    return NextResponse.json(
      { error: "今月の練習メニュー生成の上限に達しました。来月リセットされます。", source: "plan" },
      { status: 429 }
    );
  }

  const { source, duration, selectedClubs, focus, location, notes, referPractice, referPracticeMonths } = await request.json();

  // Calculate practice record date range
  const isLastOnly = referPractice === "last";
  const months = referPracticeMonths ?? 3;
  const practiceFromDate = !isLastOnly && months > 0
    ? new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Fetch context data
  let sessionsQuery = supabase
    .from("practice_sessions")
    .select("*, practice_clubs(*, club:clubs(club_number))")
    .eq("user_id", userId)
    .order("practiced_at", { ascending: false });

  if (isLastOnly) {
    sessionsQuery = sessionsQuery.limit(1);
  } else if (practiceFromDate) {
    sessionsQuery = sessionsQuery.gte("practiced_at", practiceFromDate.split("T")[0]).limit(20);
  } else {
    sessionsQuery = sessionsQuery.limit(20);
  }

  const shouldFetchSessions = isLastOnly || !!practiceFromDate;

  const [clubsRes, sessionsRes, plansRes, accessoriesRes, knowledgeRes] = await Promise.all([
    supabase.from("clubs").select("*").eq("user_id", userId).order("sort_order"),
    shouldFetchSessions ? sessionsQuery : Promise.resolve({ data: [] }),
    supabase.from("practice_plans")
      .select("title, status, rating, memo, created_at, practice_plan_items(focus)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("accessories").select("*").eq("user_id", userId).eq("status", "active"),
    supabase.from("knowledge_base").select("category, title, content").eq("status" as any, "active").limit(30),
  ]);

  const clubs = clubsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const plans = plansRes.data ?? [];
  const accessories = accessoriesRes.data ?? [];
  const knowledge = knowledgeRes.data ?? [];

  const hasSessions = sessions.length > 0;
  const hasClubs = clubs.length > 0;
  const hasInput = !!(focus || notes);

  if (!hasClubs && !hasSessions && !hasInput) {
    await decrementUsageCounter(userId, "plan");
    return NextResponse.json(
      { error: "練習メニューを生成するには、クラブの登録、練習したいことの入力、または過去の練習記録のいずれかが必要です。" },
      { status: 400 }
    );
  }

  const gapAnalysis = analyzeGaps(clubs as any);

  const systemPrompt = buildSystemPrompt({
    clubs: clubs.map((c: any) => ({
      club_number: c.club_number, maker: c.maker, model: c.model, status: c.status,
      shaft_name: c.shaft_name, distance: c.distance,
    })),
    recentSessions: sessions.map((s: any) => ({
      practiced_at: s.practiced_at, total_balls: s.total_balls, memo: s.memo,
      rating: s.rating,
      clubs: (s.practice_clubs ?? []).map((pc: any) => ({
        club_number: pc.club?.club_number ?? "?", balls: pc.balls,
      })),
    })),
    recentPlans: plans.map((p: any) => ({
      title: p.title, status: p.status, created_at: p.created_at,
    })),
    gapAnalysis,
    accessories: accessories.map((a: any) => ({
      category: a.category,
      brand: a.brand,
      model: a.model,
      rating: a.rating,
      memo: a.memo,
    })),
    knowledge: knowledge.map((k: any) => ({
      category: k.category,
      title: k.title,
      content: k.content,
    })),
  });

  let text: string;
  let usage: any;
  try {
  ({ text, usage } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: systemPrompt,
    prompt: `ユーザーの練習メニューを提案してください。
合計球数は100〜200球程度にしてください。
${duration ? `練習時間: ${duration}` : ""}
${location ? `練習場所: ${location}` : ""}
${selectedClubs && selectedClubs.length > 0 ? `利用可能なクラブ: ${selectedClubs.join(", ")}（すべて使う必要はありません。練習目的に合ったクラブを選んでください）` : ""}
${focus ? `重点的に練習したいこと: ${focus}` : ""}
${notes ? `その他の要望: ${notes}` : ""}
${clubs.length === 0 ? `\nクラブセットの登録がありません。一般的なクラブ構成（7I, PW, SW, ドライバーなど）を想定して提案してください。` : ""}

必ず以下のJSON形式のみで出力してください。JSON以外のテキストは不要です。
focusは短い練習テーマ（10文字程度）。
detailは具体的な練習方法・体の使い方・意識するポイント・注意点を詳しく記述してください（100〜200文字）。内容の区切りごとに改行（\\n）を入れて読みやすくしてください。

\`\`\`json
{
  "title": "提案タイトル",
  "summary": "提案の概要と理由",
  "items": [
    { "club_number": "番手名", "balls": 球数, "focus": "短い練習テーマ", "detail": "具体的な体の使い方、スイングのポイント、意識すること、よくあるミスと対策など詳しく記述" }
  ]
}
\`\`\``,
    maxOutputTokens: 2000,
  }));
  } catch (e) {
    await decrementUsageCounter(userId, "plan");
    throw e;
  }

  // Save token usage
  if (usage) {
    await supabase.from("ai_usage").insert({
      user_id: userId,
      input_tokens: usage.inputTokens ?? 0,
      output_tokens: usage.outputTokens ?? 0,
      model: "claude-haiku-4-5",
      source: "plan",
    });
  }

  const parsed = parsePlanResponse(text);
  if (!parsed) {
    console.error("[coach/plan] Failed to parse AI response. Raw text:", text?.substring(0, 500));
    return NextResponse.json({ error: "AIの応答を処理できませんでした。もう一度お試しください。" }, { status: 500 });
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
      club_number: item.club_number,
      balls: item.balls,
      focus: item.focus,
      detail: item.detail ?? null,
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
