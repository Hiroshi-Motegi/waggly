"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { nativeHref } from "@/lib/native-routes";
import { PageHeader } from "@/components/layout/page-header";
import { SessionForm } from "@/components/practice/session-form";
import { useClubs } from "@/hooks/use-clubs";
import { createPracticeSession, type CreateSessionData } from "@/hooks/use-practice";
import { apiFetch } from "@/lib/api-client";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";
import { showError } from "@/lib/toast";
import type { PracticePlanItem, PracticePlanWithItems } from "@/types/database";

export default function NewPracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");
  const { clubs } = useClubs("bag", 1);
  const { clubs: bag2Clubs } = useClubs("bag", 2);
  const { clubs: reserveClubs } = useClubs("reserve");
  const [pastLocations, setPastLocations] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [plan, setPlan] = useState<PracticePlanWithItems | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  useEffect(() => {
    apiFetch("/api/practice/locations")
      .then((r) => r.ok ? r.json() : [])
      .then(setPastLocations)
      .catch((e) => showError(e));
  }, []);

  useEffect(() => {
    if (!planId) return;
    apiFetch(`/api/coach/plans?id=${planId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setPlan(data.find((p: PracticePlanWithItems) => p.id === planId) ?? null);
        } else if (data) {
          setPlan(data);
        }
      })
      .catch((e) => showError(e));
  }, [planId]);

  async function handleSubmit(data: CreateSessionData) {
    setIsSubmitting(true);
    try {
      await createPracticeSession({ ...data, plan_id: planId ?? undefined });
      if (planId) {
        await apiFetch(`/api/coach/plan/${planId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        });
      }
      const { trackEvent } = await import("@/lib/gtm");
      trackEvent("practice_logged");
      setSaved(true);
    } catch (error) {
      console.error("Failed to create practice session:", error);
      showError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (saved) {
    return (
      <div className="relative flex flex-col items-center justify-center px-4 space-y-4 text-center" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
        <div className="relative z-10 flex flex-col items-center space-y-4 w-full">
          <div className="loading-bounce">
            <img src="/icons/loading-ball-white.svg" alt="" className="h-16 w-16" />
          </div>
          <h2 className="text-xl font-bold text-white">練習お疲れさまでした！</h2>
          <p className="text-base text-white/70">記録を保存しました</p>

          <div className="flex flex-col items-center gap-4 w-full">
            <div className="rounded-lg bg-black/20 p-6 w-full flex flex-col items-center gap-3">
              {planId ? (
                <Link href={nativeHref(`/coach/plans/${planId}`)} className="w-full">
                  <button className="w-full rounded-full bg-white py-3 text-base font-bold text-[#006728]">
                    練習メニューを見る
                  </button>
                </Link>
              ) : (
                <Link href="/coach/plans/new" className="w-full">
                  <button className="w-full rounded-full bg-white py-3 text-base font-bold text-[#006728]">
                    AIに次の練習メニューを提案してもらう
                  </button>
                </Link>
              )}
              <p className="text-sm text-white/60 text-center">練習データをもとにAIが最適な練習メニューを提案します</p>
              <p className="text-xs text-white/40 text-center">※ 1回あたり約3,000〜5,000 AIトークンを消費します</p>
            </div>
            <Link href="/practice">
              <button className="rounded-full border border-white px-6 py-2 text-base font-bold text-white">練習記録に戻る</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      {isSubmitting && <ProcessingOverlay />}
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="練習を記録" variant="dark" />

      {/* Plan card */}
      {plan && (
        <div className="mt-2 rounded-lg bg-white p-3">
          <button
            onClick={() => setPlanOpen(!planOpen)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold truncate">{plan.title}</p>
              <p className="text-sm text-[#8b8b8b]">練習メニュー</p>
            </div>
            {planOpen ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
          </button>
          {planOpen && (
            <div className="mt-2 pt-2 border-t border-[#dfdfdf] flex flex-col gap-2">
              <p className="text-sm text-[#8b8b8b]">{plan.summary}</p>
              {plan.practice_plan_items?.map((item: PracticePlanItem, index: number) => (
                <div key={item.id} className={index > 0 ? "border-t border-[#dfdfdf] pt-2" : ""}>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#c7e2ca] px-2.5 py-1 text-xs font-bold text-black">
                      {item.club_number ?? "?"}
                    </span>
                    <span className="rounded-full border border-[#8b8b8b] px-2.5 py-1 text-xs font-bold text-black">{item.balls}球</span>
                  </div>
                  <p className="text-sm font-bold mt-0.5">{item.focus}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <SessionForm clubs={clubs} bag2Clubs={bag2Clubs} reserveClubs={reserveClubs} pastLocations={pastLocations} onSubmit={handleSubmit} isSubmitting={isSubmitting} showCancel onCancel={() => router.back()} />
      </div>
    </div>
  );
}
