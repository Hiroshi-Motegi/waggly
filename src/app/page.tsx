"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useClubs } from "@/hooks/use-clubs";
import { usePracticeSessions } from "@/hooks/use-practice";
import { useAuth } from "@/hooks/use-auth";
import { BagSummary } from "@/components/home/bag-summary";
import { RecentPractice } from "@/components/home/recent-practice";
import { GapAnalysisCard } from "@/components/home/gap-analysis-card";
import { analyzeGaps } from "@/lib/gap-analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { clubs } = useClubs("bag");
  const { sessions } = usePracticeSessions();
  const [latestPlan, setLatestPlan] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/coach/plans")
      .then((r) => r.ok ? r.json() : [])
      .then((plans) => {
        if (plans.length > 0) setLatestPlan(plans[0]);
      })
      .catch(() => {});
  }, [user]);

  if (authLoading) {
    return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">LINEでログインしてください</p>
      </div>
    );
  }

  const gapResult = analyzeGaps(clubs);

  async function handleGeneratePlan() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/coach/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "auto" }),
      });
      if (res.ok) {
        const plan = await res.json();
        setLatestPlan(plan);
      }
    } catch (error) {
      console.error("Failed to generate plan:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h2 className="text-xl font-bold">こんにちは、{user.display_name}さん</h2>
      <BagSummary clubs={clubs} />
      <GapAnalysisCard result={gapResult} />

      {/* Practice Plan */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">練習メニュー</CardTitle>
            {latestPlan && (
              <Link href="/coach/plans">
                <span className="text-xs text-muted-foreground hover:underline">履歴</span>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestPlan ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{latestPlan.title}</p>
                <Badge variant={latestPlan.status === "new" ? "default" : "secondary"}>
                  {latestPlan.status === "new" ? "未実行" : latestPlan.status === "done" ? "実行済" : "スキップ"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{latestPlan.summary}</p>
              {latestPlan.practice_plan_items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span>{item.club?.club_number ?? "?"} — {item.focus}</span>
                  <span className="text-muted-foreground">{item.balls}球</span>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">まだ練習メニューがありません</p>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGeneratePlan}
            disabled={isGenerating}
          >
            {isGenerating ? "作成中..." : "AIに練習メニューを提案してもらう"}
          </Button>
        </CardContent>
      </Card>

      <RecentPractice sessions={sessions} />

      <Link href="/courses">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">ゴルフ場を探す</p>
              <p className="text-xs text-muted-foreground">楽天GORAでコースを検索</p>
            </div>
            <span className="text-muted-foreground">→</span>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
