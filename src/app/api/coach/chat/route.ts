import { anthropic } from "@ai-sdk/anthropic";
import { streamText, convertToModelMessages } from "ai";
import { getApiAuth } from "@/lib/supabase/api";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { analyzeGaps } from "@/lib/gap-analysis";

export async function POST(request: Request) {
  const auth = await getApiAuth();
  if (!auth) return new Response("Unauthorized", { status: 401 });
  const { supabase, userId } = auth;

  const { messages, conversationId } = await request.json();

  // Fetch user's context data in parallel
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
      club_number: c.club_number,
      maker: c.maker,
      model: c.model,
      shaft_name: c.shaft_name,
      distance: c.distance,
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
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: 1000,
    async onFinish({ text }) {
      // Save assistant response
      await supabase.from("ai_chats").insert({
        user_id: userId,
        conversation_id: conversationId,
        role: "assistant",
        message: text,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
