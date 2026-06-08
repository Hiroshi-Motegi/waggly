"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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
  const [plan, setPlan] = useState<any>(null);
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    if (!planId) return;
    fetch(`/api/coach/plans?id=${planId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setPlan(data.find((p: any) => p.id === planId) ?? null);
        } else if (data) {
          setPlan(data);
        }
      })
      .catch(() => {});
  }, [planId]);

  async function handleSubmit(data: any) {
    setIsSubmitting(true);
    try {
      await createPracticeSession({ ...data, plan_id: planId ?? undefined });
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
      if (res.ok) setPlanGenerated(true);
    } catch (error) {
      console.error("Failed to generate plan:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 space-y-4 text-center">
        <h2 className="text-lg font-bold text-[#006728]">練習お疲れさまでした！</h2>
        <p className="text-sm text-[#8b8b8b]">記録を保存しました</p>

        {planId ? (
          <div className="flex flex-col items-center gap-2 w-full max-w-xs">
            <Link href={`/coach/plans/${planId}`} className="w-full">
              <button className="w-full rounded-full bg-[#006728] border border-[#006728] py-2 text-sm font-bold text-white">
                練習メニューを見る
              </button>
            </Link>
            <Link href="/practice">
              <button className="px-5 py-1 text-sm font-bold text-[#006728]">練習記録に戻る</button>
            </Link>
          </div>
        ) : planGenerated ? (
          <div className="flex flex-col items-center gap-2 w-full max-w-xs">
            <p className="text-sm font-bold text-[#006728]">練習メニューを作成しました！</p>
            <Link href="/coach/plans" className="w-full">
              <button className="w-full rounded-full bg-[#006728] border border-[#006728] py-2 text-sm font-bold text-white">
                提案を見る
              </button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full max-w-xs">
            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="w-full rounded-full bg-[#006728] border border-[#006728] py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {isGenerating ? "メニュー作成中..." : "AIに次の練習メニューを提案してもらう"}
            </button>
            <p className="text-xs text-[#8b8b8b]">練習データをもとにAIが最適な練習メニューを提案します</p>
            <Link href="/practice">
              <button className="px-5 py-1 text-sm font-bold text-[#006728]">練習記録に戻る</button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-2 py-2">
      <PageHeader title="練習を記録" />

      {/* Plan card */}
      {plan && (
        <div className="mt-2 rounded-lg bg-white p-3">
          <button
            onClick={() => setPlanOpen(!planOpen)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{plan.title}</p>
              <p className="text-xs text-[#8b8b8b]">練習メニュー</p>
            </div>
            {planOpen ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
          </button>
          {planOpen && (
            <div className="mt-2 pt-2 border-t border-[#dfdfdf] flex flex-col gap-2">
              <p className="text-xs text-[#8b8b8b]">{plan.summary}</p>
              {plan.practice_plan_items?.map((item: any, index: number) => (
                <div key={item.id} className={index > 0 ? "border-t border-[#dfdfdf] pt-2" : ""}>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#c7e2ca] px-2 py-0.5 text-[10px] font-medium text-black">
                      {item.club?.club_number ?? "?"}
                    </span>
                    <span className="text-xs text-[#8b8b8b]">{item.balls}球</span>
                  </div>
                  <p className="text-xs font-bold mt-0.5">{item.focus}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <SessionForm clubs={clubs} onSubmit={handleSubmit} isSubmitting={isSubmitting} showCancel onCancel={() => router.back()} />
    </div>
  );
}
