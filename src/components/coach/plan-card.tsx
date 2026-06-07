"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PracticePlanWithItems } from "@/types/database";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  new: { label: "未実行", variant: "default" },
  done: { label: "実行済み", variant: "secondary" },
  skipped: { label: "スキップ", variant: "outline" },
};

interface PlanCardProps {
  plan: PracticePlanWithItems & { memo?: string | null; rating?: number | null };
  onUpdate?: (planId: string, data: { status?: string; memo?: string; rating?: number | null }) => void;
}

export function PlanCard({ plan, onUpdate }: PlanCardProps) {
  const statusInfo = statusLabels[plan.status];
  const [showFeedback, setShowFeedback] = useState(false);
  const [memo, setMemo] = useState(plan.memo ?? "");
  const [rating, setRating] = useState<number | null>(plan.rating ?? null);

  function handleDone() {
    setShowFeedback(true);
  }

  function handleSaveFeedback() {
    onUpdate?.(plan.id, { status: "done", memo: memo || undefined, rating });
    setShowFeedback(false);
  }

  function handleSkip() {
    onUpdate?.(plan.id, { status: "skipped" });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{plan.title}</CardTitle>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{plan.summary}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {plan.practice_plan_items?.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{item.club?.club_number ?? "?"}</Badge>
              <span>{item.focus}</span>
            </div>
            <span className="font-medium">{item.balls}球</span>
          </div>
        ))}

        {/* Feedback form (shown when "実行した" is tapped) */}
        {showFeedback && (
          <div className="space-y-3 pt-2 border-t mt-2">
            <p className="text-sm font-medium">練習の振り返り</p>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">評価</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(rating === star ? null : star)}
                    className={`text-2xl transition-colors ${
                      rating != null && star <= rating ? "text-amber-500" : "text-muted-foreground/30"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">メモ</p>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="感想や気づきを記録..."
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowFeedback(false)}>
                キャンセル
              </Button>
              <Button size="sm" className="flex-1" onClick={handleSaveFeedback}>
                保存
              </Button>
            </div>
          </div>
        )}

        {/* Status buttons */}
        {plan.status === "new" && !showFeedback && onUpdate && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1" onClick={handleDone}>
              実行した
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={handleSkip}>
              スキップ
            </Button>
          </div>
        )}

        {/* Show saved feedback */}
        {plan.status === "done" && (plan.rating != null || plan.memo) && (
          <div className="pt-2 border-t mt-2 space-y-1">
            {plan.rating != null && (
              <span className="text-amber-500 text-sm">{"★".repeat(plan.rating)}{"☆".repeat(5 - plan.rating)}</span>
            )}
            {plan.memo && (
              <p className="text-xs text-muted-foreground">{plan.memo}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
