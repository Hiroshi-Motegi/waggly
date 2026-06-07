"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SessionForm } from "@/components/practice/session-form";
import { useClubs } from "@/hooks/use-clubs";
import { createPracticeSession } from "@/hooks/use-practice";

export default function NewPracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");
  const { clubs } = useClubs("bag");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planGenerated, setPlanGenerated] = useState(false);

  async function handleSubmit(data: any) {
    setIsSubmitting(true);
    try {
      await createPracticeSession({ ...data, plan_id: planId ?? undefined });
      // Mark plan as done if linked
      if (planId) {
        await fetch(`/api/coach/plan/${planId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        });
      }
      setSaved(true);
    } catch (error) {
      console.error("Failed to create practice session:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGeneratePlan() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/coach/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "auto" }),
      });
      if (res.ok) {
        setPlanGenerated(true);
      }
    } catch (error) {
      console.error("Failed to generate plan:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  if (saved) {
    // If came from a plan, go to feedback
    if (planId) {
      return (
        <div className="flex flex-col items-center justify-center px-6 py-16 space-y-6 text-center">
          <span className="text-5xl">🎉</span>
          <h2 className="text-xl font-bold">練習お疲れさまでした！</h2>
          <p className="text-sm text-muted-foreground">記録を保存しました</p>
          <div className="space-y-3 w-full max-w-sm">
            <Link href={`/coach/plans/${planId}?feedback=true`}>
              <Button className="w-full">練習の振り返りを記録する</Button>
            </Link>
            <Link href="/practice">
              <Button variant="outline" className="w-full">スキップ</Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 space-y-6 text-center">
        <span className="text-5xl">🎉</span>
        <h2 className="text-xl font-bold">練習お疲れさまでした！</h2>
        <p className="text-sm text-muted-foreground">記録を保存しました</p>

        {planGenerated ? (
          <div className="space-y-3 w-full max-w-sm">
            <p className="text-sm text-primary font-medium">練習メニューを作成しました！</p>
            <Link href="/coach/plans">
              <Button className="w-full">提案を見る</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3 w-full max-w-sm">
            <Button
              className="w-full"
              onClick={handleGeneratePlan}
              disabled={isGenerating}
            >
              {isGenerating ? "メニュー作成中..." : "AIに次の練習メニューを提案してもらう"}
            </Button>
            <p className="text-xs text-muted-foreground">
              練習データをもとにAIが最適な練習メニューを提案します
            </p>
          </div>
        )}

        <Link href="/practice">
          <Button variant="outline">練習記録に戻る</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="px-4 pt-4 text-xl font-bold">練習を記録</h2>
      {planId && (
        <p className="px-4 pt-1 text-xs text-muted-foreground">練習メニューに紐づけて記録します</p>
      )}
      <SessionForm clubs={clubs} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
