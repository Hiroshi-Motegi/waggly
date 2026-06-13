"use client";
import { Loading } from "@/components/loading";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { updatePlan } from "@/hooks/use-plans";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";

const statusLabels: Record<string, string> = {
  new: "未実行",
  done: "実行済み",
  skipped: "スキップ",
};

const statusColors: Record<string, string> = {
  new: "bg-[#c7e2ca] text-black",
  done: "bg-[#d4e8f7] text-black",
  skipped: "bg-[#e0e0e0] text-black",
};

function PlanItem({ item, isLast }: { item: any; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!item.detail;

  return (
    <div className={!isLast ? "border-b border-[#dfdfdf]" : ""}>
      <button
        type="button"
        onClick={() => hasDetail && setOpen(!open)}
        className="flex items-center gap-1 w-full py-3 text-left"
      >
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <p className="text-base font-bold text-[#006728]">{item.focus}</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#c7e2ca] px-2.5 py-1 text-xs font-bold text-black">
              {item.club?.club_number ?? "?"}
            </span>
            <span className="text-sm text-[#5c5c5c]">{item.balls}球</span>
          </div>
        </div>
        {hasDetail && (
          <div className="shrink-0 ml-2">
            {open ? <ChevronUp className="h-4 w-4 text-[#8b8b8b]" /> : <ChevronDown className="h-4 w-4 text-[#8b8b8b]" />}
          </div>
        )}
      </button>
      {open && hasDetail && (
        <div className={`pb-3 ${!isLast ? "border-b border-[#dfdfdf]" : ""}`}>
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {item.detail}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PlanDetailPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    apiFetch(`/api/coach/plans?id=${planId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          setPlan(data.find((p: any) => p.id === planId) ?? null);
        } else if (data) {
          setPlan(data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [planId, user]);

  async function handleDone() {
    router.push(`/practice/new?planId=${planId}`);
  }

  async function handleSkip() {
    await updatePlan(planId, { status: "skipped" });
    setPlan({ ...plan, status: "skipped" });
  }

  async function handleDelete() {
    if (!confirm("この練習メニューを削除しますか？")) return;
    await apiFetch(`/api/coach/plan/${planId}`, { method: "DELETE" });
    router.push("/coach/plans");
  }

  if (isLoading) return <Loading variant="light" />;
  if (!plan) return <p className="p-4 text-center text-muted-foreground">見つかりません</p>;

  const totalBalls = plan.practice_plan_items?.reduce((sum: number, i: any) => sum + i.balls, 0) ?? 0;

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="練習メニュー" backHref="/coach/plans" variant="dark">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[plan.status]}`}>
          {statusLabels[plan.status]}
        </span>
      </PageHeader>

      {/* Plan info */}
      <div className="flex flex-col gap-2 rounded-lg bg-white p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#006728]">{plan.title}</h3>
          <span className="text-sm text-[#8b8b8b]">
            {new Date(plan.created_at).toLocaleDateString("ja-JP")}
          </span>
        </div>
        <p className="text-base text-[#8b8b8b]">{plan.summary}</p>
      </div>

      {/* Items */}
      <h3 className="px-1 pt-4 text-base font-bold text-white">練習内容</h3>
      <div className="flex flex-col rounded-lg bg-white p-3">
        {plan.practice_plan_items?.map((item: any, index: number) => (
          <PlanItem key={item.id} item={item} isLast={index === (plan.practice_plan_items?.length ?? 0) - 1} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-2 px-6 pt-4 pb-2">
        <button
          onClick={handleDone}
          className="w-full rounded-full bg-white border border-white py-2 text-base font-bold text-[#006728]"
        >
          この内容で練習を記録する
        </button>
        <button
          onClick={handleDelete}
          className="px-5 py-1 text-base font-bold text-white"
        >
          削除
        </button>
      </div>
      </div>
    </div>
  );
}
