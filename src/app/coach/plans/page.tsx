"use client";
import { Loading } from "@/components/loading";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { nativeHref } from "@/lib/native-routes";
import { useSearchParams } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/hooks/use-auth";
import { isNative } from "@/lib/platform";
import { usePlans } from "@/hooks/use-plans";

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
      refetch();
    }, 3000);
    return () => clearInterval(interval);
  }, [generating, isLoading, plans.length, prevCount, refetch]);

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="練習メニュー" showBack={false} variant="dark">
        {user && (
          <Link href="/coach/plans/new">
            <button className="flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#006728]">
              <Plus className="h-4 w-4" />
              新規作成
            </button>
          </Link>
        )}
      </PageHeader>

      {!user && isNative() ? (
        <div className="rounded-lg bg-white p-6 text-center">
          <p className="text-sm font-bold mb-2">AI練習メニューを利用するにはサインインが必要です</p>
          <p className="text-xs text-[#8b8b8b] mb-4">設定画面からGoogleアカウントでサインインしてください</p>
          <a href="/settings" className="inline-block rounded-full bg-[#006728] px-6 py-2 text-sm font-bold text-white">
            設定へ
          </a>
        </div>
      ) : generating ? (
        <div className="flex items-center gap-3 rounded-lg bg-white p-3">
          <Loader2 className="h-4 w-4 animate-spin text-[#006728]" />
          <p className="text-sm text-[#8b8b8b]">練習メニューを生成中...</p>
        </div>
      ) : isLoading ? (
        <Loading variant="light" />
      ) : plans.length === 0 ? (
        <div className="rounded-lg bg-white p-3">
          <p className="text-center text-sm text-[#8b8b8b] py-4">まだ練習メニューがありません</p>
        </div>
      ) : (
        <div className="flex flex-col rounded-lg bg-white p-3">
          {plans.map((plan, i) => (
            <Link key={plan.id} href={nativeHref(`/coach/plans/${plan.id}`)}>
              <div className={`flex items-center gap-2.5 py-2 ${i < plans.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[plan.status]}`}>
                      {statusLabels[plan.status]}
                    </span>
                    <span className="text-xs text-[#8b8b8b]">
                      {new Date(plan.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  <p className="text-sm font-bold truncate">{plan.title}</p>
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
