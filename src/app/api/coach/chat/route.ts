import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages } from "ai";
import { getApiAuth } from "@/lib/supabase/api";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { analyzeGaps } from "@/lib/gap-analysis";
import { checkUsageLimit } from "@/lib/ai/usage-limit";

export async function POST(request: Request) {
  try {
  const auth = await getApiAuth();
  if (!auth) return new Response("Unauthorized", { status: 401 });
  const { supabase, userId } = auth;

  // Check usage limit
  const withinLimit = await checkUsageLimit(supabase, userId);
  if (!withinLimit) {
    return new Response(JSON.stringify({ error: "今月のAI利用上限に達しました" }), { status: 429 });
  }

  const body = await request.json();
  const { messages, conversationId } = body;

  // Fetch user's context data in parallel
  const [clubsRes, sessionsRes, plansRes, accessoriesRes] = await Promise.all([
    supabase.from("clubs").select("*").eq("user_id", userId).order("sort_order"),
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
    supabase.from("accessories").select("*").eq("user_id", userId).eq("status", "active"),
  ]);

  const clubs = clubsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const plans = plansRes.data ?? [];
  const accessories = accessoriesRes.data ?? [];

  const gapAnalysis = analyzeGaps(clubs);

  const systemPrompt = buildSystemPrompt({
    clubs: clubs.map((c: any) => ({
      club_number: c.club_number,
      maker: c.maker,
      model: c.model,
      shaft_name: c.shaft_name,
      distance: c.distance,
      status: c.status,
    })),
    recentSessions: sessions.map((s: any) => ({
      practiced_at: s.practiced_at,
      total_balls: s.total_balls,
      memo: s.memo,
      clubs: (s.practice_clubs ?? []).map((pc: any) => ({
        club_number: pc.club?.club_number ?? "?",
        balls: pc.balls,
      })),
    })),
    recentPlans: plans.map((p: any) => ({
      title: p.title,
      status: p.status,
      created_at: p.created_at,
    })),
    gapAnalysis,
    accessories: accessories.map((a: any) => ({
      category: a.category,
      brand: a.brand,
      model: a.model,
      rating: a.rating,
      memo: a.memo,
    })),
  });

  // Save user message (last message's text parts)
  const lastMessage = messages[messages.length - 1];
  const userText = lastMessage?.parts
    ?.filter((p: any) => p.type === "text")
    ?.map((p: any) => p.text)
    ?.join("") ?? lastMessage?.content ?? "";

  await supabase.from("ai_chats").insert({
    user_id: userId,
    conversation_id: conversationId,
    role: "user",
    message: userText,
  });

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: 1000,
    async onFinish({ text, usage }) {
      // Save assistant response
      await supabase.from("ai_chats").insert({
        user_id: userId,
        conversation_id: conversationId,
        role: "assistant",
        message: text,
      });

      // Save token usage
      if (usage) {
        await supabase.from("ai_usage").insert({
          user_id: userId,
          input_tokens: usage.inputTokens ?? 0,
          output_tokens: usage.outputTokens ?? 0,
          model: "claude-sonnet-4-6",
          source: "chat",
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("[chat] Error:", error?.message ?? error);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), { status: 500 });
  }
}
