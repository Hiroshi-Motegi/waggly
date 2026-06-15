"use client";

import { useState, useEffect, useRef } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { useUsage } from "@/hooks/use-usage";
import { apiFetch } from "@/lib/api-client";
import { PLAN_ID } from "@/lib/plans";
import { PageHeader } from "@/components/layout/page-header";

declare global {
  interface Window {
    Payjp?: (key: string) => any;
  }
}

function CardForm({
  onToken,
  loading,
}: {
  onToken: (token: string) => void;
  loading: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [payjpInstance, setPayjpInstance] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!window.Payjp || !cardRef.current) return;
    const pj = window.Payjp(process.env.NEXT_PUBLIC_PAYJP_PUBLIC_KEY!);
    const elements = pj.elements();
    const card = elements.create("card", {
      style: {
        base: {
          fontSize: "16px",
          color: "#333",
        },
        invalid: {
          color: "#e25950",
        },
      },
    });
    card.mount(cardRef.current);
    card.on("change", (event: any) => {
      setCardError(event.error ? event.error.message : null);
      setReady(event.complete);
    });
    setPayjpInstance(pj);
    setCardElement(card);
    return () => card.unmount();
  }, []);

  async function handleSubmit() {
    if (!payjpInstance || !cardElement) return;
    const { error, id } = await payjpInstance.createToken(cardElement);
    if (error) {
      setCardError(error.message);
      return;
    }
    onToken(id);
  }

  return (
    <div className="space-y-3">
      <div
        ref={cardRef}
        className="border border-[#c4c4c4] rounded-lg p-3 bg-white min-h-[44px]"
      />
      {cardError && (
        <p className="text-sm text-red-500">{cardError}</p>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading || !ready}
        className="w-full py-3 rounded-full bg-[#006728] text-white font-bold disabled:opacity-40"
      >
        {loading ? "処理中..." : "アップグレード"}
      </button>
    </div>
  );
}

export default function PlanPage() {
  const { subscription, plan, mutate } = useSubscription();
  const { usage } = useUsage();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{
    valid: boolean;
    discount_percent: number;
    free_days: number;
  } | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showCardChange, setShowCardChange] = useState(false);

  const isPro = plan?.id === PLAN_ID.PRO;

  async function handleValidateCoupon() {
    if (!couponCode.trim()) return;
    try {
      const res = await apiFetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode }),
      });
      if (res.ok) {
        setCouponResult(await res.json());
      } else {
        setCouponResult(null);
        const err = await res.json().catch(() => ({}));
        alert(
          err.error === "coupon_already_used"
            ? "このクーポンは使用済みです"
            : err.error === "coupon_expired"
              ? "このクーポンは期限切れです"
              : "無効なクーポンコードです"
        );
      }
    } catch {
      setCouponResult(null);
    }
  }

  async function handleUpgrade(token: string) {
    setLoading(true);
    try {
      const res = await apiFetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          coupon_code: couponResult?.valid ? couponCode : undefined,
        }),
      });
      if (res.ok) {
        mutate();
        setShowCardForm(false);
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.error === "coupon_maxed_out") {
          alert(
            "このクーポンは既に使い切られました。クーポンなしで続けますか？"
          );
        } else {
          alert("決済に失敗しました。再度お試しください。");
        }
      }
    } catch {
      alert("決済に失敗しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  async function handleCardChange(token: string) {
    setLoading(true);
    try {
      const res = await apiFetch("/api/payment/card", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        alert("カード情報を更新しました。");
        setShowCardChange(false);
      } else {
        alert("カード更新に失敗しました。");
      }
    } catch {
      alert("カード更新に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

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

        {/* 現在のプラン */}
        <div className="rounded-lg bg-white p-4">
          <h3 className="text-base font-bold mb-2">
            {isPro ? "Waggly Pro" : "無料プラン"}
          </h3>
          {isPro && subscription?.current_period_end && (
            <p className="text-sm text-[#666]">
              次回更新日:{" "}
              {new Date(subscription.current_period_end).toLocaleDateString(
                "ja-JP"
              )}
            </p>
          )}
          {usage && (
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>AIチャット</span>
                <span>
                  {usage.chat.used}/{usage.chat.limit}回
                </span>
              </div>
              <div className="flex justify-between">
                <span>練習メニュー</span>
                <span>
                  {usage.plan.used}/{usage.plan.limit}回
                </span>
              </div>
            </div>
          )}
        </div>

        {/* プラン比較（無料ユーザー向け） */}
        {!isPro && (
          <div className="rounded-lg bg-white p-4">
            <h3 className="text-base font-bold mb-3">Waggly Pro</h3>
            <p className="text-2xl font-bold text-[#006728] mb-2">
              ¥480
              <span className="text-sm font-normal">/月</span>
            </p>
            <ul className="text-sm space-y-1 mb-4">
              <li>AIチャット 月100回</li>
              <li>練習メニュー提案 月30回</li>
              <li>ギア管理・練習記録は無制限</li>
            </ul>

            {/* クーポン */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="クーポンコード"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 border border-[#c4c4c4] rounded px-3 py-2 text-sm"
              />
              <button
                onClick={handleValidateCoupon}
                className="px-3 py-2 bg-[#006728] text-white rounded text-sm font-bold"
              >
                適用
              </button>
            </div>
            {couponResult?.valid && (
              <p className="text-sm text-[#006728] mb-4">
                {couponResult.discount_percent > 0 &&
                  `初月${couponResult.discount_percent}%OFF!`}
                {couponResult.free_days > 0 &&
                  `${couponResult.free_days}日間無料!`}
              </p>
            )}

            {showCardForm ? (
              <CardForm onToken={handleUpgrade} loading={loading} />
            ) : (
              <button
                onClick={() => setShowCardForm(true)}
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#006728] text-white font-bold disabled:opacity-40"
              >
                アップグレード
              </button>
            )}
          </div>
        )}

        {/* Pro ユーザー: 解約 + カード変更 */}
        {isPro && (
          <div className="rounded-lg bg-white p-4 space-y-3">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="w-full py-2 border border-red-400 text-red-500 rounded text-sm"
            >
              {loading ? "処理中..." : "解約する"}
            </button>
            {showCardChange ? (
              <CardForm onToken={handleCardChange} loading={loading} />
            ) : (
              <button
                onClick={() => setShowCardChange(true)}
                className="w-full py-2 border border-[#c4c4c4] rounded text-sm"
              >
                お支払い方法を変更
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
