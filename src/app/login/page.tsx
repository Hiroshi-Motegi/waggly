"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";
import { Capacitor } from "@capacitor/core";

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

export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [selected, setSelected] = useState<"a" | "b" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  const isIos = Capacitor.getPlatform() === "ios";

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setError(null);
    const { signInWithGoogle } = await import("@/lib/native-auth");
    const result = await signInWithGoogle();
    console.log("[login] signInWithGoogle result:", JSON.stringify({ error: result.error, hasUser: !!result.user }));
    if (result.error === "__CONFLICT__") {
      const stored = localStorage.getItem("conflict_info");
      console.log("[login] conflict_info in localStorage:", stored ? "SET (" + stored.length + ")" : "EMPTY");
      if (stored) {
        setConflictInfo(JSON.parse(stored));
        setIsSigningIn(false);
      }
      return;
    }
    if (result.error) {
      setError(result.error);
      setIsSigningIn(false);
      return;
    }
    setUser?.(result.user);
    router.replace("/");
  }

  async function handleAppleSignIn() {
    setIsSigningIn(true);
    setError(null);
    const { signInWithApple } = await import("@/lib/native-auth");
    const result = await signInWithApple();
    if (result.error === "__CONFLICT__") {
      const stored = localStorage.getItem("conflict_info");
      if (stored) {
        setConflictInfo(JSON.parse(stored));
        setIsSigningIn(false);
      }
      return;
    }
    if (result.error) {
      setError(result.error);
      setIsSigningIn(false);
      return;
    }
    setUser?.(result.user);
    router.replace("/");
  }

  function handleSelect(side: "a" | "b") {
    if (isProcessing) return;
    setSelected(side);
    setShowConfirm(true);
  }

  async function handleConfirm() {
    if (!conflictInfo || !selected) return;
    setIsProcessing(true);

    const source = selected === "a" ? conflictInfo.sourceA : conflictInfo.sourceB;
    const loser = selected === "a" ? conflictInfo.sourceB : conflictInfo.sourceA;

    try {
      const { apiFetch } = await import("@/lib/api-client");
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const resolveBody: any = {
        scenario: conflictInfo.scenario,
        provider: conflictInfo.provider,
        providerUserId: conflictInfo.providerUserId,
      };

      if (conflictInfo.scenario === "first-signin") {
        const isLocal = source.wid === null;
        resolveBody.choice = isLocal ? "local" : "server";

        if (isLocal) {
          const { collectLocalData } = await import("@/lib/sync");
          resolveBody.localData = await collectLocalData();
        }
      } else {
        const isCurrentWinner = source.wid === conflictInfo.sourceA.wid;
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

      localStorage.removeItem("conflict_info");
      const { resetLocalModeCache } = await import("@/lib/api-client");
      resetLocalModeCache();
      const { fullSync } = await import("@/lib/sync");
      await fullSync();
      window.location.href = "/";
    } catch (e) {
      console.error("Resolve conflict failed:", e);
      alert("処理に失敗しました。もう一度お試しください。");
      setIsProcessing(false);
      setShowConfirm(false);
    }
  }

  function handleCancelConflict() {
    localStorage.removeItem("conflict_info");
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.signOut();
    });
    setConflictInfo(null);
    setSelected(null);
    setShowConfirm(false);
  }

  // Conflict resolution UI
  if (conflictInfo) {
    const selectedSource = selected === "a" ? conflictInfo.sourceA : conflictInfo.sourceB;

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
        <div className="relative z-10 flex flex-col space-y-4 pt-8">
          <h1 className="text-xl font-bold text-white text-center">
            使用するデータを選んでください
          </h1>

          <DataCard
            source={conflictInfo.sourceA}
            isSelected={selected === "a"}
            onSelect={() => handleSelect("a")}
            disabled={isProcessing}
          />

          <DataCard
            source={conflictInfo.sourceB}
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
            onClick={handleCancelConflict}
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

  // Normal login UI
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[#139847]">
      <img
        src="/images/home-bg.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center px-8 w-full max-w-sm">
        {/* Logo */}
        <Image
          src="/icons/waggly-logo.svg"
          alt="Waggly"
          width={200}
          height={61}
          className="brightness-0 invert"
          priority
        />

        {/* Tagline */}
        <p className="mt-3 text-base text-white/80 text-center">
          ゴルフギアの管理をこれ一つで
        </p>

        {/* Sign in buttons */}
        <div className="flex w-full flex-col gap-3 mt-12">
          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white text-gray-800 font-bold text-base shadow-lg disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Googleでサインイン
          </button>

          {/* Apple (iOS only) */}
          {isIos && (
            <button
              onClick={handleAppleSignIn}
              disabled={isSigningIn}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-black text-white font-bold text-base disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Appleでサインイン
            </button>
          )}
        </div>

        {/* Status messages */}
        {error && (
          <p className="mt-4 text-base text-red-200 text-center">{error}</p>
        )}
        {isSigningIn && (
          <p className="mt-4 text-base text-white/70">サインイン中...</p>
        )}

        {/* Footer */}
        <p className="mt-16 text-xs text-white/40 text-center">
          サインインすることで、利用規約とプライバシーポリシーに同意します
        </p>
      </div>
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
