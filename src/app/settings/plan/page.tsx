"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useUsage } from "@/hooks/use-usage";
import { apiFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { PLAN_ID } from "@/lib/plans";
import { PageHeader } from "@/components/layout/page-header";

export default function PlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const upgraded = searchParams.get("upgraded") === "true";
  const { subscription, plan, mutate } = useSubscription();
  const { usage } = useUsage();
  const [loading, setLoading] = useState(false);
  const isPro = plan?.id === PLAN_ID.PRO;

  async function handleCancel() {
    if (
      !confirm(
        "Waggly Proを解約しますか？現在の期間終了まで引き続きご利用いただけます。"
      )
    )
      return;
    setLoading(true);
    try {
      await apiFetch("/api/subscription/cancel", { method: "POST" });
      mutate();
    } catch {
      alert("解約に失敗しました。");
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

        {/* プラン一覧 */}
        <div className="space-y-3">
          {/* 無料プラン */}
          <div className={`rounded-lg bg-white p-4 ${!isPro ? "ring-2 ring-[#006728]" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold">無料プラン</h3>
              {!isPro && (
                <span className="rounded-full bg-[#006728] px-2.5 py-0.5 text-xs font-bold text-white">
                  現在のプラン
                </span>
              )}
            </div>
            <p className="text-xl font-bold mb-2">¥0</p>
            <ul className="text-sm space-y-1 text-[#666]">
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#006728]" />AIチャット 月5回</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#006728]" />練習メニュー提案 月3回</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#006728]" />ギア管理・練習記録は無制限</li>
            </ul>
          </div>

          {/* Pro プラン */}
          <div className={`rounded-lg bg-white p-4 ${isPro ? "ring-2 ring-[#006728]" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold">Waggly Pro</h3>
              {isPro && (
                <span className="rounded-full bg-[#006728] px-2.5 py-0.5 text-xs font-bold text-white">
                  現在のプラン
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-[#006728] mb-2">
              ¥480<span className="text-sm font-normal">/月</span>
            </p>
            <ul className="text-sm space-y-1 text-[#666] mb-4">
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#006728]" />AIチャット 月100回</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#006728]" />練習メニュー提案 月30回</li>
              <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#006728]" />ギア管理・練習記録は無制限</li>
            </ul>

            {!isPro && (
              <Link
                href="/settings/plan/checkout"
                className="flex items-center justify-center w-full py-3 rounded-full bg-[#006728] text-white font-bold"
              >
                アップグレード
              </Link>
            )}
          </div>
        </div>

        {/* Pro ユーザー: 解約 + カード変更 */}
        {isPro && (
          <div className="space-y-3">
            {subscription?.current_period_end && (
              <p className="text-sm text-white/70 text-center">
                次回更新日: {new Date(subscription.current_period_end).toLocaleDateString("ja-JP")}
              </p>
            )}
            <button
              onClick={() => router.push("/settings/plan/checkout?change_card=true")}
              className="w-full py-2 rounded-lg bg-white text-sm text-center"
            >
              お支払い方法を変更
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="w-full py-2 text-sm text-red-400 text-center"
            >
              {loading ? "処理中..." : "解約する"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
