"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useUsage } from "@/hooks/use-usage";
import { apiFetch } from "@/lib/api-client";
import { PLAN_ID } from "@/lib/plans";
import { PageHeader } from "@/components/layout/page-header";
import { trackEvent } from "@/lib/gtm";

function PlanPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const upgraded = searchParams.get("upgraded") === "true";
  const { subscription, plan, mutate } = useSubscription();
  const { usage } = useUsage();
  const [loading, setLoading] = useState(false);
  const isPro = plan?.id === PLAN_ID.PRO;
  const isPaused = subscription?.status === "paused";

  useEffect(() => {
    trackEvent("plan_page_viewed", { current_plan: isPro ? "pro" : "free" });
  }, [isPro]);

  async function handlePause() {
    const periodEnd = subscription?.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString("ja-JP")
      : null;
    if (
      !confirm(
        `有料プランを解約しますか？${periodEnd ? `\n${periodEnd}まではPro機能を引き続きご利用いただけます。\nそれまでの間はいつでも再開できます。` : ""}`
      )
    )
      return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/subscription/pause", { method: "POST" });
      if (res.ok) {
        trackEvent("plan_paused");
        mutate();
      } else {
        alert("プラン変更に失敗しました。");
      }
    } catch {
      alert("プラン変更に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleResume() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/subscription/resume", { method: "POST" });
      if (res.ok) {
        mutate();
      } else {
        alert("再開に失敗しました。");
      }
    } catch {
      alert("再開に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative flex flex-col px-2 py-2 space-y-4"
      style={{
        minHeight: "100dvh",
        paddingBottom: "var(--bottom-nav-height)",
      }}
    >
      <div className="relative z-10 flex flex-col space-y-4">
        <PageHeader title="プラン" backHref="/settings" variant="dark" />

        {/* アップグレード完了メッセージ */}
        {upgraded && (
          <div className="rounded-lg bg-[#ebf1eb] border border-[#006728] p-3">
            <p className="text-sm text-[#006728] font-medium text-center">
              Waggly Pro にアップグレードしました！
            </p>
          </div>
        )}

        {/* 利用状況 */}
        {usage && (
          <div className="rounded-lg bg-white px-4 py-3">
            <p className="text-sm font-bold mb-2">今月の利用状況</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>AIチャット</span>
                <span>{usage.chat.used}/{usage.chat.limit}回</span>
              </div>
              <div className="flex justify-between">
                <span>練習メニュー</span>
                <span>{usage.plan.used}/{usage.plan.limit}回</span>
              </div>
            </div>
          </div>
        )}

        {/* Pro 未加入 */}
        {!isPro && !isPaused && (
          <div className="space-y-3">
            <div className="rounded-lg bg-white p-4 text-center space-y-4">
              <p className="text-sm text-[#666] leading-relaxed">
                基本機能は無料でお使いいただけます。<br />
                AI機能の利用回数を増やしたい場合は、有料プランをご検討ください。
              </p>
              <Link
                href="/settings/plan/checkout"
                className="flex items-center justify-center w-full py-3 rounded-full bg-[#006728] text-white font-bold"
              >
                Waggly Pro に加入する
              </Link>
              <Link
                href="/help/plans"
                className="text-sm text-[#006728] underline"
              >
                有料プランについて
              </Link>
            </div>
          </div>
        )}

        {/* Pro 加入中 */}
        {isPro && !isPaused && (
          <div className="space-y-3">
            <div className="rounded-lg bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold">Waggly Pro</h3>
                <span className="rounded-full bg-[#006728] px-2.5 py-0.5 text-xs font-bold text-white">
                  加入中
                </span>
              </div>
              <p className="text-xl font-bold text-[#006728] mb-2">
                ¥480<span className="text-sm font-normal">/月</span>
              </p>
              <ul className="text-sm space-y-1 text-[#666] mb-4">
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#006728]" />AIチャット 月100回</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#006728]" />練習メニュー提案 月30回</li>
              </ul>
              {subscription?.current_period_end && (
                <p className="text-xs text-[#8b8b8b] text-center mb-3">
                  次回更新日: {new Date(subscription.current_period_end).toLocaleDateString("ja-JP")}
                </p>
              )}
              <button
                onClick={handlePause}
                disabled={loading}
                className="w-full py-2.5 rounded-full border border-[#c4c4c4] text-sm text-[#666]"
              >
                {loading ? "処理中..." : "有料プランを解約する"}
              </button>
            </div>
          </div>
        )}

        {/* 解約予定（課金期間内） */}
        {isPaused && (
          <div className="space-y-3">
            <div className="rounded-lg bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold">Waggly Pro</h3>
                <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">
                  解約予定
                </span>
              </div>
              <ul className="text-sm space-y-1 text-[#666] mb-4">
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#006728]" />AIチャット 月100回</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#006728]" />練習メニュー提案 月30回</li>
              </ul>
              <button
                onClick={handleResume}
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#006728] text-white font-bold disabled:opacity-40 mb-2"
              >
                {loading ? "処理中..." : "Waggly Pro を再開する"}
              </button>
              {subscription?.current_period_end && (
                <p className="text-xs text-[#8b8b8b] text-center">
                  {new Date(subscription.current_period_end).toLocaleDateString("ja-JP")}まで Pro 機能をご利用いただけます
                </p>
              )}
            </div>
          </div>
        )}

        {/* Waggly を解約（アカウント削除） */}
        <div className="pt-4">
          <Link
            href="/settings/delete-account"
            className="block w-full py-2 text-sm text-white/70 text-center"
          >
            Waggly を解約（アカウント削除）
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PlanPage() {
  return <Suspense><PlanPageInner /></Suspense>;
}
