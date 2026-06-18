import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, isErrorResponse } from "@/lib/admin-auth";
import { runAutoCollectPipeline } from "@/lib/knowledge/pipeline";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  let supabase;

  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    // Cron job: use service role directly
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  } else {
    // Manual trigger: require admin
    const result = await requireAdmin();
    if (isErrorResponse(result)) return result;
    supabase = result.supabase;
  }

  try {
    const result = await runAutoCollectPipeline(supabase);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    try {
      await supabase.from("knowledge_auto_runs").insert({
        period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        period_end: new Date().toISOString().split("T")[0],
        total_sessions: 0,
        total_plans: 0,
        summary: "パイプライン実行エラー",
        topics_generated: 0,
        status: "error",
        error_message: message,
      });
    } catch { /* ignore logging error */ }

    console.error("[Auto-collect Pipeline Error]", message);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Internal server error" },
      { status: 500 }
    );
  }
}
