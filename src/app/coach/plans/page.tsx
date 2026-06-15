"use client";
import { Loading } from "@/components/loading";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { nativeHref } from "@/lib/native-routes";
import { useSearchParams } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { isNative } from "@/lib/platform";
import { usePlans } from "@/hooks/use-plans";
import { useUsage } from "@/hooks/use-usage";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_ID } from "@/lib/plans";

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

export default function PlansPage() {
  const { user } = useAuth();
  const { plans, isLoading, refetch } = usePlans();
  const { usage } = useUsage();
  const { plan: currentPlan } = useSubscription();
  const isPro = currentPlan?.id === PLAN_ID.PRO;
  const planLimitReached = usage ? usage.plan.remaining <= 0 : false;
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const searchParams = useSearchParams();
  const isGenerating = searchParams.get("generating") === "true";
  const [generating, setGenerating] = useState(isGenerating);
  const [prevCount, setPrevCount] = useState<number | null>(null);

  useEffect(() => {
    if (!generating) return;
    if (isLoading) return;
    if (prevCount === null) {
      setPrevCount(plans.length);
      return;
    }
    if (plans.length > prevCount) {
      setGenerating(false);
      return;
    }
    const interval = setInterval(() => {
      refetchRef.current();
    }, 3000);
    return () => clearInterval(interval);
  }, [generating, isLoading, plans.length, prevCount]);

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="練習メニュー" backHref="/" variant="dark">
        {user && (
          <Link href="/coach/plans/new">
            <button className="flex items-center gap-1 rounded-full bg-white px-4 h-[40px] text-sm font-bold text-[#006728]">
              <Plus className="h-4 w-4" />
              新規作成
            </button>
          </Link>
        )}
      </PageHeader>

      {usage && user && (
        <div className="rounded-lg bg-white px-3 py-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#333]">今月の生成回数</span>
            <span className={`text-sm font-bold ${planLimitReached ? "text-red-500" : "text-[#006728]"}`}>{usage.plan.used} / {usage.plan.limit}回</span>
          </div>
          {planLimitReached && !isPro && (
            <>
              <p className="text-xs text-[#8b8b8b]">今月の上限に達しました。来月リセットされます。</p>
              <Link href="/settings/plan" className="flex items-center justify-center rounded-full bg-[#006728] py-2 text-sm font-bold text-white">
                上限を増やす
              </Link>
            </>
          )}
        </div>
      )}

      {!user && isNative() ? (
        <div className="rounded-lg bg-white p-6 text-center">
          <p className="text-base font-bold mb-2">AI練習メニューを利用するにはサインインが必要です</p>
          <p className="text-sm text-[#8b8b8b] mb-4">設定画面からGoogleアカウントでサインインしてください</p>
          <Link href="/settings" className="inline-block rounded-full bg-[#006728] px-6 py-2 text-base font-bold text-white">
            設定へ
          </Link>
        </div>
      ) : generating ? (
        <div className="flex items-center gap-3 rounded-lg bg-white p-3">
          <Loader2 className="h-4 w-4 animate-spin text-[#006728]" />
          <p className="text-base text-[#8b8b8b]">練習メニューを生成中...</p>
        </div>
      ) : isLoading ? (
        <Loading variant="light" />
      ) : plans.length === 0 ? (
        <div className="rounded-lg bg-white p-3">
          <p className="text-center text-base text-[#8b8b8b] py-4">まだ練習メニューがありません</p>
        </div>
      ) : (
        <div className="flex flex-col rounded-lg bg-white p-3">
          {plans.map((plan, i) => (
            <Link key={plan.id} href={nativeHref(`/coach/plans/${plan.id}`)}>
              <div className={`flex items-center gap-2.5 py-2 ${i < plans.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[plan.status]}`}>
                      {statusLabels[plan.status]}
                    </span>
                    <span className="text-sm text-[#8b8b8b]">
                      {new Date(plan.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  <p className="text-base font-bold truncate">{plan.title}</p>
                </div>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="shrink-0 opacity-60" />
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
