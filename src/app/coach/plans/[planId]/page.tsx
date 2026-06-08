"use client";
import { Loading } from "@/components/loading";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { updatePlan } from "@/hooks/use-plans";
import { useAuth } from "@/hooks/use-auth";

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

function PlanItem({ item, showSeparator }: { item: any; showSeparator: boolean }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!item.detail;

  return (
    <div className={showSeparator ? "border-t border-[#dfdfdf] pt-3" : ""}>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-bold">{item.focus}</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#c7e2ca] px-2 py-0.5 text-[10px] font-medium text-black">
            {item.club?.club_number ?? "?"}
          </span>
          <span className="text-xs text-[#8b8b8b]">{item.balls}球</span>
        </div>
        {hasDetail && (
          <>
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1 text-xs font-bold text-[#006728]"
            >
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {open ? "閉じる" : "詳細を見る"}
            </button>
            {open && (
              <p className="text-sm text-[#8b8b8b] leading-relaxed pl-3 border-l-2 border-[#006728]/20 whitespace-pre-wrap">
                {item.detail}
              </p>
            )}
          </>
        )}
      </div>
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
    if (!user) return;
    fetch(`/api/coach/plans?id=${planId}`)
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
    await fetch(`/api/coach/plan/${planId}`, { method: "DELETE" });
    router.push("/coach/plans");
  }

  if (isLoading) return <Loading />;
  if (!plan) return <p className="p-4 text-center text-muted-foreground">見つかりません</p>;

  const totalBalls = plan.practice_plan_items?.reduce((sum: number, i: any) => sum + i.balls, 0) ?? 0;

  return (
    <div className="flex flex-col px-2 py-2 space-y-2">
      <PageHeader title="練習メニュー" backHref="/coach/plans">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[plan.status]}`}>
          {statusLabels[plan.status]}
        </span>
      </PageHeader>

      {/* Plan info */}
      <div className="flex flex-col gap-2 rounded-lg bg-white p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#006728]">{plan.title}</h3>
          <span className="text-xs text-[#8b8b8b]">
            {new Date(plan.created_at).toLocaleDateString("ja-JP")}
          </span>
        </div>
        <p className="text-sm text-[#8b8b8b]">{plan.summary}</p>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-3 rounded-lg bg-white p-3">
        <h3 className="text-base font-bold text-[#006728]">練習内容</h3>
        {plan.practice_plan_items?.map((item: any, index: number) => (
          <PlanItem key={item.id} item={item} showSeparator={index > 0} />
        ))}
        <div className="flex justify-between border-t border-[#dfdfdf] pt-2 text-sm font-bold">
          <span>合計</span>
          <span>{totalBalls}球</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-1 px-[30px] pt-2">
        <button
          onClick={handleDone}
          className="w-full rounded-full bg-[#006728] border border-[#006728] py-2 text-sm font-bold text-white"
        >
          この内容で練習を記録する
        </button>
        <button
          onClick={handleDelete}
          className="px-5 py-1 text-sm font-bold text-black"
        >
          削除
        </button>
      </div>
    </div>
  );
}
