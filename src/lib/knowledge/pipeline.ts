import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnonymousSessions, getAnonymousPlanFeedback } from "./anonymize";
import { analyzeKnowledgeGaps } from "./analyze";
import { searchGolfKnowledge } from "./search";
import { generateKnowledgeItem } from "./generate";

export interface PipelineResult {
  status: "success" | "no_data" | "error";
  summary: string;
  topicsGenerated: number;
  errorMessage?: string;
}

export async function runAutoCollectPipeline(
  supabase: SupabaseClient
): Promise<PipelineResult> {
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. Collect anonymous data
  const [sessions, plans] = await Promise.all([
    getAnonymousSessions(supabase, 7),
    getAnonymousPlanFeedback(supabase, 7),
  ]);

  // Skip if no data
  if (sessions.total_count === 0 && plans.total_count === 0) {
    await saveRun(supabase, {
      periodStart,
      periodEnd,
      totalSessions: 0,
      totalPlans: 0,
      summary: "対象データなし",
      topicsGenerated: 0,
      status: "no_data",
    });
    return { status: "no_data", summary: "対象データなし", topicsGenerated: 0 };
  }

  // 2. Get existing knowledge titles
  const { data: existing } = await supabase
    .from("knowledge_base")
    .select("title")
    .eq("status", "active");
  const existingTitles = (existing ?? []).map((k: any) => k.title);

  // 3. Analyze gaps
  const analysis = await analyzeKnowledgeGaps(sessions, plans, existingTitles);

  // 4. For each topic: search + generate + save as draft
  let topicsGenerated = 0;
  for (const topic of analysis.topics) {
    try {
      const { results, answer } = await searchGolfKnowledge(topic.search_query);
      const generated = await generateKnowledgeItem(topic, results, answer);

      await supabase.from("knowledge_base").insert({
        category: topic.category,
        title: generated.title,
        content: generated.content,
        tags: generated.tags,
        source: "auto-collected",
        status: "draft",
        analysis_summary: topic.reason,
        search_sources: results.map((r) => r.url),
        generated_at: new Date().toISOString(),
      });

      topicsGenerated++;
    } catch (err) {
      console.error(`Failed to generate topic "${topic.topic}":`, err);
    }
  }

  // 5. Save run log
  await saveRun(supabase, {
    periodStart,
    periodEnd,
    totalSessions: sessions.total_count,
    totalPlans: plans.total_count,
    summary: analysis.summary,
    topicsGenerated,
    status: "success",
  });

  return {
    status: "success",
    summary: analysis.summary,
    topicsGenerated,
  };
}

async function saveRun(
  supabase: SupabaseClient,
  data: {
    periodStart: Date;
    periodEnd: Date;
    totalSessions: number;
    totalPlans: number;
    summary: string;
    topicsGenerated: number;
    status: "success" | "no_data" | "error";
    errorMessage?: string;
  }
) {
  await supabase.from("knowledge_auto_runs").insert({
    period_start: data.periodStart.toISOString().split("T")[0],
    period_end: data.periodEnd.toISOString().split("T")[0],
    total_sessions: data.totalSessions,
    total_plans: data.totalPlans,
    summary: data.summary,
    topics_generated: data.topicsGenerated,
    status: data.status,
    error_message: data.errorMessage ?? null,
  });
}
