"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";
import { useAdFree } from "@/hooks/use-ad-free";
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

function getPayjp() {
  if (!payjpSingleton && window.Payjp) {
    payjpSingleton = window.Payjp(process.env.NEXT_PUBLIC_PAYJP_PUBLIC_KEY!);
  }
  return payjpSingleton;
}

export default function RemoveAdsPage() {
  const router = useRouter();
  const { isAdFree } = useAdFree();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    name: string | null;
    discount_percent: number;
  } | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [saveCard, setSaveCard] = useState(false);

  // 既存カード情報を取得
  const { data: cardData } = useSWR<{ card: { brand: string; last4: string; exp_month: number; exp_year: number } | null }>(
    "/api/payment/card-info",
    (url: string) => apiFetch(url).then((r) => r.json())
  );
  const existingCard = cardData?.card ?? null;

  // 新しいカード入力が必要かどうか
  const needsCardInput = !existingCard || useNewCard;

  const cardState = useRef<{ element: PayjpCardElement | null }>({ element: null });

  useEffect(() => {
    if (!needsCardInput) return;

    function mountCard() {
      const container = document.getElementById("payjp-card-element-ads");
      if (!container || !window.Payjp) return;
      const pj = getPayjp();
      if (!pj) return;
      const elements = pj.elements();
      const card = elements.create("card", {
        style: {
          base: { fontSize: "16px", color: "#333" },
          invalid: { color: "#e25950" },
        },
      });
      card.mount("#payjp-card-element-ads");
      card.on("change", (e) => {
        setCardError(e.error ? e.error.message : null);
        setReady(e.complete);
      });
      cardState.current.element = card;
      setMounted(true);
    }

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

    return () => {
      if (cardState.current.element) {
        try { cardState.current.element.unmount(); } catch (e) { console.warn("Payjp unmount:", e); }
        cardState.current.element = null;
      }
      setMounted(false);
      setReady(false);
    };
  }, [needsCardInput]);

  const price = promoResult?.valid
    ? Math.round(100 * (1 - promoResult.discount_percent / 100))
    : 100;

  async function handleValidatePromo() {
    if (!promoCode.trim()) return;
    setError(null);
    try {
      const res = await apiFetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode }),
      });
      if (res.ok) {
        const data = await res.json();
        setPromoResult({ valid: true, name: data.name, discount_percent: data.discount_percent });
      } else {
        setPromoResult(null);
        const err = await res.json().catch(() => ({}));
        setError(
          err.error === "coupon_already_used"
            ? "このコードは使用済みです"
            : "無効なコードです"
        );
      }
    } catch {
      setPromoResult(null);
    }
  }

  async function handlePurchase() {
    setLoading(true);
    setError(null);

    let tokenId: string | undefined;

    if (needsCardInput) {
      const pj = getPayjp();
      if (!pj || !cardState.current.element) { setLoading(false); return; }

      const { error: tokenError, id } = await pj.createToken(cardState.current.element, {
        three_d_secure: true,
      });
      if (tokenError) {
        setCardError(tokenError.message);
        setLoading(false);
        return;
      }
      tokenId = id;
    }

    try {
      const res = await apiFetch("/api/payment/remove-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenId,
          promo_code: promoResult?.valid ? promoCode : undefined,
          save_card: tokenId ? saveCard : undefined,
        }),
      });
      if (res.ok) {
        router.push("/settings?ad_free=true");
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "購入に失敗しました。");
      }
    } catch {
      setError("購入に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  if (isAdFree) {
    return (
      <div className="relative flex flex-col px-2 py-2 space-y-4" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)" }}>
        <div className="relative z-10 flex flex-col space-y-4">
          <PageHeader title="広告を非表示にする" backHref="/settings" variant="dark" />
          <div className="rounded-lg bg-white p-4 text-center">
            <p className="text-base font-bold text-[#006728]">広告は非表示になっています</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-4" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)" }}>
      {loading && <ProcessingOverlay message="購入処理中..." />}
      <div className="relative z-10 flex flex-col space-y-4">
        <PageHeader title="広告を非表示にする" backHref="/settings" variant="dark" />

        <div className="rounded-lg bg-white p-4 space-y-4">
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-[#006728]">
              {price === 0 ? "無料" : `¥${price}`}
            </p>
            <p className="text-sm text-[#8b8b8b]">買い切り（一度購入すればずっと広告なし）</p>
          </div>

          <ul className="text-sm space-y-1 text-[#666]">
            <li>- ホーム画面・チャット画面のバナー広告を非表示</li>
            <li>- ページ遷移時の全画面広告を非表示</li>
            <li>- 同じアカウントならどの端末でも有効</li>
          </ul>

          {/* プロモコード */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="プロモコード"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 border border-[#c4c4c4] rounded px-3 py-2 text-sm"
            />
            <button
              onClick={handleValidatePromo}
              className="px-3 py-2 bg-[#006728] text-white rounded text-sm font-bold"
            >
              適用
            </button>
          </div>
          {promoResult?.valid && (
            <p className="text-sm text-[#006728]">クーポンが適用されました</p>
          )}

          {/* カード情報（¥0 の場合は非表示） */}
          {price > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-bold">カード情報</p>
              {existingCard ? (
                <div className="space-y-3">
                  {/* ラジオ選択 */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="card-choice"
                      checked={!useNewCard}
                      onChange={() => setUseNewCard(false)}
                      className="w-4 h-4 accent-[#006728]"
                    />
                    <span className="text-sm text-[#333]">登録したカードを利用する</span>
                  </label>
                  {!useNewCard && (
                    <div className="ml-6 border border-[#c4c4c4] rounded-lg p-3 bg-[#f9f9f9] flex items-center justify-between">
                      <p className="text-base font-bold">
                        {existingCard.brand} •••• {existingCard.last4}
                      </p>
                      <span className="text-sm text-[#8b8b8b]">
                        {String(existingCard.exp_month).padStart(2, "0")}/{existingCard.exp_year}
                      </span>
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="card-choice"
                      checked={useNewCard}
                      onChange={() => setUseNewCard(true)}
                      className="w-4 h-4 accent-[#006728]"
                    />
                    <span className="text-sm text-[#333]">別のカードを利用する</span>
                  </label>
                  {useNewCard && (
                    <div className="ml-6 space-y-2">
                      <div
                        id="payjp-card-element-ads"
                        className="border border-[#c4c4c4] rounded-lg p-3 bg-white min-h-[44px]"
                      />
                      {!mounted && <p className="text-sm text-[#8b8b8b]">読み込み中...</p>}
                      {cardError && <p className="text-sm text-red-500">{cardError}</p>}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveCard}
                          onChange={(e) => setSaveCard(e.target.checked)}
                          className="w-4 h-4 accent-[#006728]"
                        />
                        <span className="text-sm text-[#333]">このカードを今後の支払いに利用する</span>
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    id="payjp-card-element-ads"
                    className="border border-[#c4c4c4] rounded-lg p-3 bg-white min-h-[44px]"
                  />
                  {!mounted && <p className="text-sm text-[#8b8b8b]">読み込み中...</p>}
                  {cardError && <p className="text-sm text-red-500">{cardError}</p>}
                </div>
              )}
            </div>
          )}

          {promoResult?.valid && (
            <div className="rounded-lg border border-[#006728] bg-[#f0f9f4] p-3 text-center space-y-1">
              <p className="text-sm font-bold text-[#006728]">クーポンが適用されました</p>
              <p className="text-base font-bold text-[#006728]">
                {promoResult.name ?? `${promoResult.discount_percent}%OFFクーポン`}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={loading || (price > 0 && needsCardInput && !ready)}
            className="w-full py-3 rounded-full bg-[#006728] text-white font-bold disabled:opacity-40"
          >
            {loading
              ? "処理中..."
              : price === 0
                ? "広告を非表示にする"
                : promoResult?.valid
                  ? <><span className="line-through opacity-60">¥100</span> → ¥{price}で購入する</>
                  : `¥${price}で購入する`}
          </button>
        </div>
      </div>
    </div>
  );
}
