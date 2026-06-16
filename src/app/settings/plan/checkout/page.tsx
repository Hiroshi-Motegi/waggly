"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";
import useSWR from "swr";

interface PayjpCardElement {
  mount(selector: string): void;
  unmount(): void;
  on(event: string, handler: (e: { error?: { message: string }; complete: boolean }) => void): void;
}

interface PayjpInstance {
  elements(): { create(type: string, options: Record<string, unknown>): PayjpCardElement };
  createToken(element: PayjpCardElement, options?: Record<string, unknown>): Promise<{ error?: { message: string }; id: string }>;
}

declare global {
  interface Window {
    Payjp?: (key: string) => PayjpInstance;
  }
}

let payjpSingleton: PayjpInstance | null = null;

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const changeCard = searchParams.get("change_card") === "true";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponResult, setCouponResult] = useState<{
    valid: boolean;
    discount_percent: number;
    free_days: number;
  } | null>(null);

  // 現在のカード情報（カード変更時）
  const { data: currentCard } = useSWR<{ card: { brand: string; last4: string; exp_month: number; exp_year: number } | null }>(
    changeCard ? "/api/payment/card-info" : null,
    (url: string) => apiFetch(url).then((r) => r.json())
  );

  // カードエレメントを保持
  const [cardState] = useState<{ element: PayjpCardElement | null }>({ element: null });

  useEffect(() => {
    function mountCard() {
      const container = document.getElementById("payjp-card-element");
      if (!container || !window.Payjp) return;

      if (!payjpSingleton) {
        payjpSingleton = window.Payjp(process.env.NEXT_PUBLIC_PAYJP_PUBLIC_KEY!);
      }
      const elements = payjpSingleton.elements();
      const card = elements.create("card", {
        style: {
          base: { fontSize: "16px", color: "#333" },
          invalid: { color: "#e25950" },
        },
      });
      card.mount("#payjp-card-element");
      card.on("change", (e) => {
        setCardError(e.error ? e.error.message : null);
        setReady(e.complete);
      });
      cardState.element = card;
      setMounted(true);
    }

    function loadAndMount() {
      // DOM が確実に存在するまで待つ
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (window.Payjp) {
            mountCard();
          } else {
            const script = document.createElement("script");
            script.src = "https://js.pay.jp/v2/pay.js";
            script.onload = mountCard;
            document.head.appendChild(script);
          }
        });
      });
    }

    loadAndMount();

    return () => {
      if (cardState.element) {
        try { cardState.element.unmount(); } catch (e) { console.warn("Payjp unmount:", e); }
        cardState.element = null;
        setMounted(false);
      }
    };
  }, []);

  async function handleValidateCoupon() {
    if (!couponInput.trim()) return;
    setError(null);
    try {
      const res = await apiFetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput }),
      });
      if (res.ok) {
        setCouponResult(await res.json());
      } else {
        setCouponResult(null);
        const err = await res.json().catch(() => ({}));
        setError(
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

  async function handleSubmit() {
    if (!payjpSingleton || !cardState.element) return;
    setLoading(true);
    setError(null);

    const { error: tokenError, id } = await payjpSingleton.createToken(cardState.element, {
      three_d_secure: true,
    });
    if (tokenError) {
      setCardError(tokenError.message);
      setLoading(false);
      return;
    }

    try {
      if (changeCard) {
        const res = await apiFetch("/api/payment/card", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: id }),
        });
        if (res.ok) {
          router.push("/settings/plan");
        } else {
          setError("カード更新に失敗しました。");
        }
      } else {
        const res = await apiFetch("/api/payment/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: id,
            coupon_code: couponResult?.valid ? couponInput : undefined,
          }),
        });
        if (res.ok) {
          router.push("/settings/plan?upgraded=true");
        } else {
          const err = await res.json().catch(() => ({}));
          setError(
            err.error === "coupon_maxed_out"
              ? "クーポンは既に使い切られました。"
              : "決済に失敗しました。再度お試しください。"
          );
        }
      }
    } catch {
      setError("決済に失敗しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative flex flex-col px-2 py-2 space-y-4"
      style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)" }}
    >
      {loading && <ProcessingOverlay message="決済処理中..." />}
      <div className="relative z-10 flex flex-col space-y-4">
        <PageHeader
          title={changeCard ? "カード変更" : "お支払い"}
          backHref={changeCard ? "/settings" : "/settings/plan"}
          variant="dark"
        />

        <div className="rounded-lg bg-white p-4 space-y-4">
          {!changeCard && (
            <div className="flex items-center justify-between pb-3 border-b border-[#ececec]">
              <span className="text-base font-bold">Waggly Pro</span>
              <span className="text-base font-bold text-[#006728]">¥480/月</span>
            </div>
          )}

          {/* 現在のカード情報（カード変更時） */}
          {changeCard && currentCard?.card && (
            <div className="pb-3 border-b border-[#ececec]">
              <p className="text-sm text-[#8b8b8b] mb-1">現在のカード</p>
              <p className="text-base font-bold">
                {currentCard.card.brand} •••• {currentCard.card.last4}
                <span className="text-sm font-normal text-[#8b8b8b] ml-2">
                  {currentCard.card.exp_month}/{currentCard.card.exp_year}
                </span>
              </p>
            </div>
          )}

          {/* クーポン（新規購入時のみ） */}
          {!changeCard && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="クーポンコード"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
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
                <p className="text-sm text-[#006728]">
                  {couponResult.discount_percent > 0 &&
                    `初月${couponResult.discount_percent}%OFF!`}
                  {couponResult.free_days > 0 &&
                    `${couponResult.free_days}日間無料!`}
                </p>
              )}
            </div>
          )}

          {/* カード入力 */}
          <div className="space-y-2">
            <p className="text-sm font-bold">カードを変更</p>
            <div
              id="payjp-card-element"
              className="border border-[#c4c4c4] rounded-lg p-3 bg-white min-h-[44px]"
            />
            {!mounted && (
              <p className="text-sm text-[#8b8b8b]">読み込み中...</p>
            )}
            {cardError && <p className="text-sm text-red-500">{cardError}</p>}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !ready}
            className="w-full py-3 rounded-full bg-[#006728] text-white font-bold disabled:opacity-40"
          >
            {loading
              ? "処理中..."
              : changeCard
                ? "カードを更新"
                : "¥480で購入する"}
          </button>

          {!changeCard && (
            <p className="text-xs text-[#8b8b8b] text-center">
              月額¥480が毎月自動的に課金されます。いつでも解約できます。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
