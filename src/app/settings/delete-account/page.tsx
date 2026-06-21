"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_ID } from "@/lib/plans";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";
import { apiFetch } from "@/lib/api-client";
import { isNative } from "@/lib/platform";

export default function DeleteAccountPage() {
  const router = useRouter();
  const { plan, subscription } = useSubscription();
  const isPro = plan?.id === PLAN_ID.PRO;
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (res.ok) {
        const { trackEvent } = await import("@/lib/gtm");
        trackEvent("account_deleted", { reason: reason.trim() });
        // ログアウト処理
        if (isNative()) {
          const { createClient } = await import("@/lib/supabase/client");
          await createClient().auth.signOut();
        } else {
          const { liffLogout } = await import("@/lib/liff");
          await liffLogout();
        }
        router.push("/");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "削除に失敗しました。");
      }
    } catch {
      alert("削除に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative flex flex-col px-2 py-2 space-y-4"
      style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)" }}
    >
      {loading && <ProcessingOverlay message="アカウントを削除中..." />}
      <div className="relative z-10 flex flex-col space-y-4">
        <PageHeader title="Waggly を解約" backHref="/settings/plan" variant="dark" />

        <div className="rounded-lg bg-white p-4 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
            <p className="text-base font-bold text-red-500">この操作は取り消せません</p>
          </div>

          <div className="space-y-2 text-sm text-[#666]">
            <p>アカウントを削除すると、以下の全てのデータが完全に削除されます：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>マイバッグ（クラブ・メモ・メンテナンス記録）</li>
              <li>練習記録</li>
              <li>練習メニュー</li>
              <li>AI相談履歴</li>
              <li>アクセサリー</li>
              <li>プロフィール・共有設定</li>
            </ul>
          </div>

          {isPro && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-700">
                現在 Waggly Pro をご利用中です。アカウント削除と同時にサブスクリプションも解約されます。
                {subscription?.current_period_end && (
                  <>残りの期間（{new Date(subscription.current_period_end).toLocaleDateString("ja-JP")}まで）の返金はありません。</>
                )}
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <p className="text-sm text-[#666]">解約理由をお聞かせください</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例: 使わなくなった、他のアプリに乗り換えた..."
              rows={3}
              className="w-full border border-[#c4c4c4] rounded-lg px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c4c4c4]"
            />
          </div>

          <button
            onClick={() => {
              if (confirm("本当にアカウントを削除しますか？\nこの操作は取り消せません。")) {
                handleDelete();
              }
            }}
            disabled={loading || !reason.trim()}
            className="w-full py-3 rounded-full bg-red-500 text-white font-bold disabled:opacity-40"
          >
            アカウントを削除する
          </button>
        </div>
      </div>
    </div>
  );
}
