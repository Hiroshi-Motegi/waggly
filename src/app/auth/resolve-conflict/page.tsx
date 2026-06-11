"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";

interface DataSourceInfo {
  label: string;
  isNew: boolean;
  wid: string | null;
  lastUpdated: string | null;
  counts: { clubs: number; practices: number; accessories: number };
}

interface ConflictInfo {
  scenario: "first-signin" | "account-linking";
  provider: string;
  providerUserId: string;
  sourceA: DataSourceInfo;
  sourceB: DataSourceInfo;
}

export default function ResolveConflictPage() {
  const [info, setInfo] = useState<ConflictInfo | null>(null);
  const [selected, setSelected] = useState<"a" | "b" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let stored = sessionStorage.getItem("conflict_info");

    // Fallback: read from cookie (set by server-side redirect)
    if (!stored) {
      const cookieMatch = document.cookie.match(/conflict_info=([^;]+)/);
      if (cookieMatch) {
        stored = decodeURIComponent(cookieMatch[1]);
        sessionStorage.setItem("conflict_info", stored);
        document.cookie = "conflict_info=; path=/; max-age=0";
      }
    }

    if (stored) {
      setInfo(JSON.parse(stored));
    } else {
      window.location.href = "/";
    }
  }, []);

  function handleSelect(side: "a" | "b") {
    if (isProcessing) return;
    setSelected(side);
    setShowConfirm(true);
  }

  async function handleConfirm() {
    if (!info || !selected) return;
    setIsProcessing(true);

    const source = selected === "a" ? info.sourceA : info.sourceB;
    const loser = selected === "a" ? info.sourceB : info.sourceA;

    try {
      const { apiFetch } = await import("@/lib/api-client");
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      let resolveBody: any = {
        scenario: info.scenario,
        provider: info.provider,
        providerUserId: info.providerUserId,
      };

      if (info.scenario === "first-signin") {
        const isLocal = source.wid === null;
        resolveBody.choice = isLocal ? "local" : "server";

        if (isLocal) {
          const { collectLocalData } = await import("@/lib/sync");
          resolveBody.localData = await collectLocalData();
        }
      } else {
        const isCurrentWinner = source.wid === info.sourceA.wid;
        resolveBody.choice = isCurrentWinner ? "current" : "existing";
        resolveBody.winnerWid = source.wid;
        resolveBody.loserWid = loser.wid;
      }

      const res = await apiFetch("/api/auth/resolve-conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolveBody),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "処理に失敗しました。もう一度お試しください。");
        setIsProcessing(false);
        setShowConfirm(false);
        return;
      }

      const result = await res.json();

      if (result.access_token) {
        await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });
      }

      sessionStorage.removeItem("conflict_info");
      const { isNative } = await import("@/lib/platform");
      if (isNative()) {
        const { resetLocalModeCache } = await import("@/lib/api-client");
        resetLocalModeCache();
        const { fullSync } = await import("@/lib/sync");
        await fullSync();
      }
      window.location.href = "/";
    } catch (e) {
      console.error("Resolve conflict failed:", e);
      alert("処理に失敗しました。もう一度お試しください。");
      setIsProcessing(false);
      setShowConfirm(false);
    }
  }

  function handleCancel() {
    sessionStorage.removeItem("conflict_info");
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.signOut();
    });
    window.location.href = "/";
  }

  if (!info) return null;

  const selectedSource = selected === "a" ? info.sourceA : info.sourceB;

  return (
    <div
      className="relative flex flex-col px-4 py-4 space-y-4 bg-[#139847]"
      style={{ minHeight: "100dvh" }}
    >
      <img
        src="/images/home-bg.jpg"
        alt=""
        className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
      />
      <div className="relative z-10 flex flex-col space-y-4">
        <PageHeader
          title="使用するデータを選んでください"
          variant="dark"
          showBack={false}
        />

        <DataCard
          source={info.sourceA}
          isSelected={selected === "a"}
          onSelect={() => handleSelect("a")}
          disabled={isProcessing}
        />

        <DataCard
          source={info.sourceB}
          isSelected={selected === "b"}
          onSelect={() => handleSelect("b")}
          disabled={isProcessing}
        />

        <div className="flex items-start gap-2 rounded-lg bg-white/90 p-3">
          <span className="text-amber-500 text-lg">⚠</span>
          <p className="text-sm text-[#666]">
            選ばなかった側のデータは削除され、復元できません
          </p>
        </div>

        <button
          onClick={handleCancel}
          disabled={isProcessing}
          className="text-sm text-white/80 py-2 text-center disabled:opacity-50"
        >
          キャンセル
        </button>
      </div>

      {showConfirm && selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm space-y-4">
            <p className="text-base font-bold text-center">
              {selectedSource.label}を使用します
            </p>
            <p className="text-sm text-[#666] text-center">
              もう一方のデータは削除されます。よろしいですか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-lg border border-[#ccc] text-sm disabled:opacity-50"
              >
                戻る
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-lg bg-[#006728] text-white text-sm font-bold disabled:opacity-50"
              >
                {isProcessing ? "処理中..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataCard({
  source,
  isSelected,
  onSelect,
  disabled,
}: {
  source: DataSourceInfo;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const hasData =
    source.counts.clubs > 0 ||
    source.counts.practices > 0 ||
    source.counts.accessories > 0;

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left rounded-xl p-4 transition-all disabled:opacity-50 ${
        isSelected
          ? "bg-white ring-2 ring-[#006728] shadow-lg"
          : "bg-white/90 shadow"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {source.isNew && (
          <span className="text-xs font-bold text-white bg-[#006728] rounded-full px-2 py-0.5">
            NEW
          </span>
        )}
        <span className="text-base font-bold text-[#333]">
          {source.label}
        </span>
      </div>

      {hasData ? (
        <>
          <div className="flex gap-4 text-sm text-[#666] mb-1">
            <span>クラブ: {source.counts.clubs}件</span>
            <span>練習記録: {source.counts.practices}件</span>
          </div>
          <div className="flex gap-4 text-sm text-[#666] mb-1">
            <span>アクセサリー: {source.counts.accessories}件</span>
          </div>
          {source.lastUpdated && (
            <p className="text-xs text-[#999] mt-1">
              最終更新: {formatDate(source.lastUpdated)}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-[#999]">データはありません</p>
      )}
    </button>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
