"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";

interface MergeInfo {
  provider: string;
  providerId: string;
  originalUserId: string;
  currentAccount: { id: string; display_name: string };
  existingAccount: { id: string; display_name: string };
}

export default function MergePage() {
  const [info, setInfo] = useState<MergeInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("merge_info");
    if (stored) {
      setInfo(JSON.parse(stored));
    } else {
      window.location.href = "/settings";
    }
  }, []);

  async function handleChoice(keepAccountId: string) {
    if (!info) return;
    setIsProcessing(true);

    try {
      const { apiFetch } = await import("@/lib/api-client");
      const res = await apiFetch("/api/auth/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: info.provider,
          providerId: info.providerId,
          originalUserId: info.originalUserId,
          confirmMerge: true,
          keepAccountId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "統合に失敗しました");
        window.location.href = "/settings";
        return;
      }

      sessionStorage.removeItem("merge_info");
      const { createClient } = await import("@/lib/supabase/client");
      await createClient().auth.signOut();
      alert("アカウントを統合しました。再ログインしてください。");
      window.location.href = "/";
    } catch {
      alert("統合に失敗しました");
      window.location.href = "/settings";
    }
  }

  function handleCancel() {
    sessionStorage.removeItem("merge_info");
    window.location.href = "/settings";
  }

  if (!info) return null;

  const providerLabel = info.provider === "google" ? "Google" : "LINE";

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh" }}>
      <img src="/images/home-bg.jpg" alt="" className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
        <PageHeader title="アカウント統合" variant="dark" showBack={false} />

        <div className="rounded-lg bg-white p-4">
          <p className="text-base font-bold mb-2">既存の{providerLabel}アカウントが見つかりました</p>
          <p className="text-sm text-[#8b8b8b] mb-4">
            どちらのデータを残しますか？選ばなかった方のデータは削除されます。
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleChoice(info.currentAccount.id)}
              disabled={isProcessing}
              className="flex flex-col gap-1 rounded-lg border-2 border-[#006728] p-4 text-left disabled:opacity-50"
            >
              <span className="text-base font-bold text-[#006728]">現在のアカウントを残す</span>
              <span className="text-sm text-[#8b8b8b]">{info.currentAccount.display_name}</span>
            </button>

            <button
              onClick={() => handleChoice(info.existingAccount.id)}
              disabled={isProcessing}
              className="flex flex-col gap-1 rounded-lg border-2 border-[#006728] p-4 text-left disabled:opacity-50"
            >
              <span className="text-base font-bold text-[#006728]">{providerLabel}のアカウントを残す</span>
              <span className="text-sm text-[#8b8b8b]">{info.existingAccount.display_name}</span>
            </button>

            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="text-sm text-[#8b8b8b] py-2"
            >
              キャンセル
            </button>
          </div>

          {isProcessing && (
            <p className="text-sm text-[#006728] text-center mt-3">処理中...</p>
          )}
        </div>
      </div>
    </div>
  );
}
