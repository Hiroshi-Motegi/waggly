"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlans } from "@/hooks/use-plans";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  new: { label: "未実行", variant: "default" },
  done: { label: "実行済み", variant: "secondary" },
  skipped: { label: "スキップ", variant: "outline" },
};

export default function PlansPage() {
  const { plans, isLoading, refetch } = usePlans();
  const searchParams = useSearchParams();
  const isGenerating = searchParams.get("generating") === "true";
  const [generating, setGenerating] = useState(isGenerating);
  const [prevCount, setPrevCount] = useState<number | null>(null);

  // Poll for new plan when generating
  useEffect(() => {
    if (!generating) return;
    if (prevCount === null && plans.length >= 0) {
      setPrevCount(plans.length);
    }
    if (prevCount !== null && plans.length > prevCount) {
      setGenerating(false);
      return;
    }
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [generating, plans.length, prevCount, refetch]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">練習メニュー</h2>
        <Link href="/coach/plans/new">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      {generating && (
        <Card>
          <CardContent className="flex items-center gap-3 p-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">練習メニューを生成中...</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground">読み込み中...</p>
      ) : plans.length === 0 && !generating ? (
        <p className="text-center text-muted-foreground py-8">まだ練習メニューがありません</p>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => {
            const status = statusLabels[plan.status];
            return (
              <Link key={plan.id} href={`/coach/plans/${plan.id}`}>
                <Card className="mb-2">
                  <CardContent className="flex items-center justify-between p-3">
                    <p className="text-sm font-medium flex-1 mr-2">{plan.title}</p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
