"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { updatePlan } from "@/hooks/use-plans";
import { useAuth } from "@/hooks/use-auth";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  new: { label: "未実行", variant: "default" },
  done: { label: "実行済み", variant: "secondary" },
  skipped: { label: "スキップ", variant: "outline" },
};

export default function PlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoFeedback = searchParams.get("feedback") === "true";
  const [plan, setPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(autoFeedback);
  const [memo, setMemo] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/coach/plans?id=${planId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        // If the API returns array, find our plan
        if (Array.isArray(data)) {
          const found = data.find((p: any) => p.id === planId);
          setPlan(found ?? null);
          setMemo(found?.memo ?? "");
          setRating(found?.rating ?? null);
        } else if (data) {
          setPlan(data);
          setMemo(data.memo ?? "");
          setRating(data.rating ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [planId, user]);

  async function handleDone() {
    // Navigate to practice recording with plan ID
    router.push(`/practice/new?planId=${planId}`);
  }

  async function handleSaveFeedback() {
    await updatePlan(planId, { status: "done", memo: memo || undefined, rating });
    setPlan({ ...plan, status: "done", memo, rating });
    setShowFeedback(false);
  }

  async function handleSkip() {
    await updatePlan(planId, { status: "skipped" });
    setPlan({ ...plan, status: "skipped" });
  }

  async function handleDelete() {
    if (!confirm("この練習メニューを削除しますか？")) return;
    await fetch(`/api/coach/plan/${planId}`, { method: "DELETE" });
    router.push("/coach/plans");
  }

  if (isLoading) return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  if (!plan) return <p className="p-4 text-center text-muted-foreground">見つかりません</p>;

  const statusInfo = statusLabels[plan.status];

  return (
    <div className="space-y-4 p-4 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{plan.title}</h2>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(plan.created_at).toLocaleDateString("ja-JP")}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{plan.summary}</p>

      <Card>
        <CardHeader><CardTitle className="text-base">練習内容</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {plan.practice_plan_items?.map((item: any, index: number) => {
            // Parse focus: 【title｜subtitle】body
            const titleMatch = item.focus?.match(/^【(.+?)(?:｜|\\|)(.+?)】\s*([\s\S]*)$/);
            const title = titleMatch ? titleMatch[1] : null;
            const subtitle = titleMatch ? titleMatch[2] : null;
            const body = titleMatch ? titleMatch[3] : item.focus;

            return (
            <div key={item.id}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.club?.club_number ?? "?"}</Badge>
                    <span className="text-sm font-medium">{item.balls}球</span>
                  </div>
                </div>
                {title && (
                  <h4 className="text-sm font-bold">{title}
                    {subtitle && <span className="text-xs text-muted-foreground font-normal ml-2">{subtitle}</span>}
                  </h4>
                )}
                {body && <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>}
              </div>
            </div>
            );}
          ))}
          <Separator className="my-2" />
          <div className="flex justify-between text-sm font-medium">
            <span>合計</span>
            <span>{plan.practice_plan_items?.reduce((sum: number, i: any) => sum + i.balls, 0) ?? 0}球</span>
          </div>
        </CardContent>
      </Card>

      {/* Feedback form */}
      {showFeedback && (
        <Card>
          <CardHeader><CardTitle className="text-base">練習の振り返り</CardTitle></CardHeader>
          <CardContent className="space-y-3">
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
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowFeedback(false)}>キャンセル</Button>
              <Button className="flex-1" onClick={handleSaveFeedback}>保存</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status buttons */}
      {plan.status === "new" && !showFeedback && (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleDone}>実行した</Button>
          <Button variant="outline" className="flex-1" onClick={handleSkip}>スキップ</Button>
        </div>
      )}

      {/* Saved feedback */}
      {plan.status === "done" && (plan.rating != null || plan.memo) && (
        <Card>
          <CardHeader><CardTitle className="text-base">振り返り</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {plan.rating != null && (
              <span className="text-amber-500">{"★".repeat(plan.rating)}{"☆".repeat(5 - plan.rating)}</span>
            )}
            {plan.memo && <p className="text-sm text-muted-foreground">{plan.memo}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
