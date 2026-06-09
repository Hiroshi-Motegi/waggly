import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getApiAuth } from "@/lib/supabase/api";
import { runAutoCollectPipeline } from "@/lib/knowledge/pipeline";

export const dynamic = "force-static";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  let supabase;

  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  } else {
    const auth = await getApiAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    supabase = auth.supabase;
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

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
