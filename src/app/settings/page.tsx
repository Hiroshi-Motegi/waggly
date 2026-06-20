"use client";

import { Loading } from "@/components/loading";
import { useEffect, useState } from "react";
import type { User } from "@/types/database";
import Image from "next/image";
import Link from "next/link";
import { Download, HelpCircle, Loader2 } from "lucide-react";
import { ProcessingOverlay } from "@/components/ui/processing-overlay";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { isNative } from "@/lib/platform";
import { liffLogout } from "@/lib/liff";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { useProfile } from "@/hooks/use-profile";
import { useAdFree } from "@/hooks/use-ad-free";
import { showError } from "@/lib/toast";

interface DataCounts {
  clubs: number;
  practices: number;
  accessories: number;
}

interface ConflictSource {
  label: string;
  isNew: boolean;
  wid: string | null;
  lastUpdated: string | null;
  counts: DataCounts;
}

interface NativeConflictData {
  provider: string;
  providerSub: string;
  localSummary: { lastUpdated: string | null; counts: DataCounts };
  existingUser: { userId: string; lastUpdated: string | null; counts: DataCounts };
}

interface ConflictInfo {
  scenario: "first-signin" | "account-linking";
  provider: string;
  providerSub: string;
  sourceA: ConflictSource;
  sourceB: ConflictSource;
}

interface UsageData {
  chat: { used: number; limit: number; remaining: number };
  plan: { used: number; limit: number; remaining: number };
  limitReached: boolean;
}

interface SubscriptionData {
  subscription: { plan_id: string; status: string; current_period_end: string | null } | null;
  plan: { id: string; name: string; price: number; ai_chat_monthly_limit: number; ai_plan_monthly_limit: number };
}

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { isAdFree } = useAdFree();
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [linkToast, setLinkToast] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linked = params.get("linked");
    if (linked) {
      setLinkToast(`${linked === "google" ? "Google" : linked === "facebook" ? "Facebook" : "LINE"}を連携しました`);
      window.history.replaceState(null, "", "/settings");
      const timer = setTimeout(() => setLinkToast(null), 3000);
      return () => clearTimeout(timer);
    }
    const conflict = params.get("conflict");
    if (conflict) {
      // LINE callback uses localStorage/sessionStorage, Google/Facebook callback uses URL hash
      const stored = localStorage.getItem("conflict_info") || sessionStorage.getItem("conflict_info");
      if (stored) {
        try {
          setConflictInfo(JSON.parse(stored));
          localStorage.removeItem("conflict_info");
          sessionStorage.removeItem("conflict_info");
        } catch {}
      } else {
        // Google/Facebook callback: URL hash (base64url encoded)
        const hash = window.location.hash.slice(1);
        if (hash) {
          try {
            const bytes = atob(hash.replace(/-/g, "+").replace(/_/g, "/"));
            const utf8 = new TextDecoder("utf-8").decode(Uint8Array.from(bytes, (c) => c.charCodeAt(0)));
            setConflictInfo(JSON.parse(utf8));
          } catch {}
        }
      }
      window.history.replaceState(null, "", "/settings");
    }
  }, []);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  const [cardInfo, setCardInfo] = useState<{ brand: string; last4: string; exp_month: number; exp_year: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/usage").then((r) => r.ok ? r.json() : null).then(setUsage).catch((e) => showError(e)).finally(() => setUsageLoaded(true));
    apiFetch("/api/subscription").then((r) => r.ok ? r.json() : null).then(setSubscription).catch((e) => showError(e));
    apiFetch("/api/payment/card-info").then((r) => r.ok ? r.json() : null).then((d) => setCardInfo(d?.card ?? null)).catch((e) => showError(e));
  }, [user]);

  const [processing, setProcessing] = useState<string | null>(null);
  const [isLineApp, setIsLineApp] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [conflictSelected, setConflictSelected] = useState<"a" | "b" | null>(null);
  const [conflictConfirm, setConflictConfirm] = useState(false);

  useEffect(() => {
    import("@/lib/platform").then(({ isLineBrowser }) => setIsLineApp(isLineBrowser()));
  }, []);

  if (conflictInfo) {
    // Show conflict resolution UI
    const selectedSource = conflictSelected === "a" ? conflictInfo.sourceA : conflictInfo.sourceB;
    return (
      <div className="relative flex flex-col px-4 py-4 space-y-4" style={{ minHeight: "100dvh" }}>
        {processing && <ProcessingOverlay message={processing} />}
        <div className="relative z-10 flex flex-col space-y-4 pt-4">
          <h1 className="text-xl font-bold text-white text-center">使用するデータを選んでください</h1>
          {["a", "b"].map((side) => {
            const src = side === "a" ? conflictInfo.sourceA : conflictInfo.sourceB;
            const isSel = conflictSelected === side;
            const hasData = src.counts.clubs > 0 || src.counts.practices > 0 || src.counts.accessories > 0;
            return (
              <button key={side} onClick={() => { setConflictSelected(side as "a" | "b"); setConflictConfirm(true); }} disabled={!!processing}
                className={`w-full text-left rounded-xl p-4 transition-all disabled:opacity-50 ${isSel ? "bg-white ring-2 ring-[#006728] shadow-lg" : "bg-white/90 shadow"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {src.isNew && <span className="text-xs font-bold text-white bg-[#006728] rounded-full px-2 py-0.5">NEW</span>}
                  <span className="text-base font-bold text-[#333]">{src.label}</span>
                </div>
                {hasData ? (
                  <>
                    <div className="flex gap-4 text-sm text-[#666] mb-1">
                      <span>クラブ: {src.counts.clubs}件</span>
                      <span>練習記録: {src.counts.practices}件</span>
                    </div>
                    <div className="text-sm text-[#666] mb-1">アクセサリー: {src.counts.accessories}件</div>
                    {src.lastUpdated && <p className="text-xs text-[#999] mt-1">最終更新: {new Date(src.lastUpdated).toLocaleString("ja-JP")}</p>}
                  </>
                ) : (
                  <p className="text-sm text-[#999]">データはありません</p>
                )}
              </button>
            );
          })}
          <div className="flex items-start gap-2 rounded-lg bg-white/90 p-3">
            <span className="text-amber-500 text-lg">⚠</span>
            <p className="text-sm text-[#666]">選ばなかった側のデータは削除され、復元できません</p>
          </div>
          <button onClick={() => {
            localStorage.removeItem("conflict_info");
            sessionStorage.removeItem("conflict_info");
            setConflictInfo(null); setConflictSelected(null); setConflictConfirm(false);
          }} disabled={!!processing} className="text-sm text-white/80 py-2 text-center disabled:opacity-50">キャンセル</button>
        </div>
        {conflictConfirm && selectedSource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
            <div className="bg-white rounded-xl p-5 w-full max-w-sm space-y-4">
              <p className="text-base font-bold text-center">{selectedSource.label}を使用します</p>
              <p className="text-sm text-[#666] text-center">もう一方のデータは削除されます。よろしいですか？</p>
              <div className="flex gap-3">
                <button onClick={() => setConflictConfirm(false)} disabled={!!processing} className="flex-1 py-2.5 rounded-lg border border-[#ccc] text-sm disabled:opacity-50">戻る</button>
                <button onClick={async () => {
                  setProcessing("データを処理中...");
                  try {
                    const source = conflictSelected === "a" ? conflictInfo.sourceA : conflictInfo.sourceB;
                    let res: Response;

                    if (conflictInfo.scenario === "account-linking") {
                      // account-linking: link-provider に confirmMerge で再送
                      res = await apiFetch("/api/auth/link-provider", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          provider: conflictInfo.provider,
                          providerSub: conflictInfo.providerSub,
                          confirmMerge: true,
                          keepAccountId: source.wid,
                        }),
                      });
                    } else {
                      // first-signin: resolve-session PUT
                      const isLocal = source.wid === null;
                      const resolveBody: Record<string, unknown> = {
                        choice: isLocal ? "local" : "server",
                        existingUserId: conflictInfo.sourceB.wid,
                        provider: conflictInfo.provider,
                        providerSub: conflictInfo.providerSub,
                      };
                      if (isLocal) {
                        const { collectLocalData } = await import("@/lib/sync");
                        resolveBody.localData = await collectLocalData();
                      }
                      res = await apiFetch("/api/auth/resolve-session", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resolveBody) });
                    }

                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      alert(err.error || "処理に失敗しました");
                      setProcessing(null); setConflictConfirm(false);
                      return;
                    }
                    const resolveResult = await res.json();
                    localStorage.removeItem("conflict_info");
                    sessionStorage.removeItem("conflict_info");
                    if (resolveResult.user) {
                      setUser?.(resolveResult.user);
                    }
                    // ローカルを選んだ場合、画像をアップロード
                    const isLocal = source.wid === null;
                    if (isNative() && isLocal) {
                      try {
                        const { collectLocalData, uploadLocalImages } = await import("@/lib/sync");
                        const localData = await collectLocalData();
                        await uploadLocalImages(localData);
                      } catch {}
                    }
                    // fullSync でサーバーとローカルを同期
                    if (isNative()) {
                      try {
                        const { fullSync } = await import("@/lib/sync");
                        await fullSync();
                      } catch {}
                    }
                    setConflictInfo(null); setConflictSelected(null); setConflictConfirm(false); setProcessing(null);
                    window.location.href = "/settings";
                  } catch { alert("処理に失敗しました"); setProcessing(null); setConflictConfirm(false); }
                }} disabled={!!processing} className="flex-1 py-2.5 rounded-lg bg-[#006728] text-white text-sm font-bold disabled:opacity-50">
                  {processing ? "処理中..." : "OK"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!user && isNative()) {
    return (
      <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
        {processing && <ProcessingOverlay message={processing} />}
        <div className="relative z-10 flex flex-col space-y-2">
          <PageHeader title="設定" variant="dark" />
          <div className="rounded-lg bg-white p-4">
            <h3 className="text-base font-bold mb-2">アカウント</h3>
            <p className="text-sm text-[#8b8b8b] mb-3">サインインするとプロフィール公開・共有、AIコーチ、データのバックアップ・Web版との同期が使えます。</p>
            <button
              onClick={async () => {
                // LINE内ブラウザの場合は外部ブラウザで開く
                const { isLineBrowser } = await import("@/lib/platform");
                if (isLineBrowser()) {
                  window.open(`${window.location.origin}/settings`, "_blank");
                  return;
                }
                setProcessing("ログイン中...");
                try {
                  const { signInWithGoogle } = await import("@/lib/native-auth");
                  const result = await signInWithGoogle();
                  if (result.conflict) {
                    const c = result.conflict as unknown as NativeConflictData;
                    const info: ConflictInfo = {
                      scenario: "first-signin",
                      provider: c.provider,
                      providerSub: c.providerSub,
                      sourceA: {
                        label: "ローカルのデータ",
                        isNew: true,
                        wid: null,
                        lastUpdated: c.localSummary.lastUpdated,
                        counts: c.localSummary.counts,
                      },
                      sourceB: {
                        label: "サーバーのデータ",
                        isNew: false,
                        wid: c.existingUser.userId,
                        lastUpdated: c.existingUser.lastUpdated,
                        counts: c.existingUser.counts,
                      },
                    };
                    setConflictInfo(info);
                    setProcessing(null);
                    return;
                  }
                  if (result.error) {
                    alert("サインインに失敗しました");
                    setProcessing(null);
                    return;
                  }
                  if (result.user) {
                    setUser?.(result.user);
                    router.push("/");
                  } else {
                    setProcessing(null);
                  }
                } catch {
                  alert("サインインに失敗しました");
                  setProcessing(null);
                }
              }}
              className="flex h-11 w-full max-w-64 mx-auto items-center justify-center gap-2 rounded-full bg-[#006728] text-white text-base font-bold"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Googleでサインイン
            </button>
            {isLineApp && (
              <p className="text-xs text-[#8b8b8b] text-center mt-1">LINEアプリ内ではGoogleログインを利用できません。外部ブラウザを起動します。</p>
            )}
            <button
              onClick={async () => {
                setProcessing("ログイン中...");
                try {
                  const { signInWithLine } = await import("@/lib/native-auth");
                  const result = await signInWithLine();
                  if (!result.error && !result.conflict && !result.user) {
                    // キャンセル
                    setProcessing(null);
                    return;
                  }
                  if (result.conflict) {
                    const c = result.conflict as unknown as NativeConflictData;
                    const info: ConflictInfo = {
                      scenario: "first-signin",
                      provider: c.provider,
                      providerSub: c.providerSub,
                      sourceA: {
                        label: "ローカルのデータ",
                        isNew: true,
                        wid: null,
                        lastUpdated: c.localSummary.lastUpdated,
                        counts: c.localSummary.counts,
                      },
                      sourceB: {
                        label: "サーバーのデータ",
                        isNew: false,
                        wid: c.existingUser.userId,
                        lastUpdated: c.existingUser.lastUpdated,
                        counts: c.existingUser.counts,
                      },
                    };
                    setConflictInfo(info);
                    setProcessing(null);
                    return;
                  }
                  if (result.error) {
                    alert("サインインに失敗しました");
                    setProcessing(null);
                    return;
                  }
                  if (result.user) {
                    setUser?.(result.user);
                    router.push("/");
                  } else {
                    setProcessing(null);
                  }
                } catch {
                  alert("サインインに失敗しました");
                  setProcessing(null);
                }
              }}
              className="mt-2 flex h-11 w-full max-w-64 mx-auto items-center justify-center gap-2 rounded-full bg-[#06C755] text-white text-base font-bold"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              LINEでサインイン
            </button>
          </div>
          <div className="rounded-lg bg-white p-3">
            <div className="flex flex-col gap-2">
              <Link href="/help/contact" className="flex items-center justify-between py-2 border-b border-[#dfdfdf]">
                <span className="text-base">お問い合わせ</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40" style={{ width: "auto", height: "auto" }} />
              </Link>
              <Link href="/terms" className="flex items-center justify-between py-2 border-b border-[#dfdfdf]">
                <span className="text-base">利用規約</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40" style={{ width: "auto", height: "auto" }} />
              </Link>
              <Link href="/privacy" className="flex items-center justify-between py-2 border-b border-[#dfdfdf]">
                <span className="text-base">プライバシーポリシー</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40" style={{ width: "auto", height: "auto" }} />
              </Link>
              <Link href="/legal" className="flex items-center justify-between py-2 border-b border-[#dfdfdf]">
                <span className="text-base">特定商取引法に基づく表記</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40" style={{ width: "auto", height: "auto" }} />
              </Link>
              <Link href="/help" className="flex items-center justify-between py-2">
                <span className="text-base">ご利用ガイド</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40" style={{ width: "auto", height: "auto" }} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const currentPlanId = subscription?.plan?.id ?? "free";
  const isPro = currentPlanId === "pro";
  const isPaused = subscription?.subscription?.status === "paused";

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      {processing && <ProcessingOverlay message={processing} />}
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="設定" variant="dark" />

      {/* プロフィール */}
      <div className="rounded-lg bg-white p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14">
            <AvatarImage src={profile?.avatar_url ?? (profileLoading ? undefined : user.avatar_url) ?? undefined} />
            <AvatarFallback className="text-lg">
              {profileLoading ? "" : (profile?.nickname ?? user.display_name ?? "?")[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-bold">
              {profileLoading ? "　" : (profile?.nickname || user.display_name)}
            </p>
            <p className="text-sm text-[#8b8b8b]">ID: W-{user.id.replace(/-/g, "").substring(0, 12).toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* プロフィール・共有設定 */}
      <div className="flex flex-col rounded-lg bg-white p-3">
        <Link href="/settings/profile">
          <div className="flex items-center justify-between py-3 border-b border-[#ececec]">
            <span className="text-base">プロフィール設定</span>
            <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" style={{ width: "auto", height: "auto" }} />
          </div>
        </Link>
        <Link href="/settings/share">
          <div className={`flex items-center justify-between py-3 ${isPro ? "border-b border-[#ececec]" : ""}`}>
            <span className="text-base">名刺・共有設定</span>
            <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" style={{ width: "auto", height: "auto" }} />
          </div>
        </Link>
        {isPro && (
          <Link href="/settings/plan/checkout?change_card=true">
            <div className="flex items-center justify-between py-3">
              <span className="text-base">お支払い方法</span>
              <div className="flex items-center gap-2">
                {cardInfo && (
                  <span className="text-sm text-[#8b8b8b]">下4桁 {cardInfo.last4}</span>
                )}
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" style={{ width: "auto", height: "auto" }} />
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* アカウント連携 */}
      <div className="flex items-center justify-between px-1 pt-4">
        <p className="text-base font-bold text-white">アカウント連携</p>
        <Link href="/help/account-linking">
          <HelpCircle className="h-5 w-5 text-white opacity-80" />
        </Link>
      </div>
      <AccountLinking user={user} onConflict={setConflictInfo} setProcessing={setProcessing} />

      {/* プラン */}
      <p className="text-base font-bold text-white px-1 pt-4">プラン</p>
      <div className="rounded-lg bg-white p-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold">{!subscription ? "" : isPro ? "Waggly Pro" : "無料プラン"}</span>
            {!isPro && !isPaused && (
              <p className="text-xs text-[#8b8b8b] mt-0.5">AI相談・練習生成に回数制限があります</p>
            )}
            {isPaused && subscription?.subscription?.current_period_end && (
              <p className="text-xs text-amber-500 mt-0.5">
                解約予定（{new Date(subscription.subscription.current_period_end).toLocaleDateString("ja-JP")}まで利用可能）
              </p>
            )}
          </div>
          {!isPro && !isPaused && (
            <span className="rounded-full bg-[#8b8b8b] px-2.5 py-0.5 text-xs font-bold text-white shrink-0">
              準備中
            </span>
          )}
        </div>
      </div>
      {!isPro && !isPaused && (
        <p className="text-xs text-white/70 px-1 mt-1">有料プランは現在準備中です</p>
      )}

      {/* 広告設定 */}
      <p className="text-base font-bold text-white px-1 pt-4">広告</p>
      {isAdFree ? (
        <div className="rounded-lg bg-white p-3">
          <p className="text-base font-bold">広告非表示</p>
          <p className="text-xs text-[#006728]">購入済み</p>
        </div>
      ) : (
        <div className="rounded-lg bg-white p-3 flex items-center justify-between">
          <div>
            <p className="text-base font-bold">広告を非表示にする</p>
            <p className="text-xs text-[#8b8b8b]">¥100 の買い切り</p>
          </div>
          <span className="rounded-full bg-[#8b8b8b] px-2.5 py-0.5 text-xs font-bold text-white">
            準備中
          </span>
        </div>
      )}
      {!isAdFree && (
        <p className="text-xs text-white/70 px-1 mt-1">広告非表示機能は現在準備中です</p>
      )}

      {/* AIコーチ利用状況 */}
      <p className="text-base font-bold text-white px-1 pt-4">AI相談利用状況</p>
      <div className="rounded-lg bg-white p-3">
        {usage ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#8b8b8b]">AIチャット</span>
              <span className="font-medium">{usage.chat.used}/{usage.chat.limit}回</span>
            </div>
            <div className="h-2 rounded-full bg-[#ebf1eb] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usage.chat.limit > 0 && usage.chat.used / usage.chat.limit >= 0.9 ? "bg-red-500" : usage.chat.limit > 0 && usage.chat.used / usage.chat.limit >= 0.7 ? "bg-yellow-500" : "bg-[#006728]"
                }`}
                style={{ width: `${usage.chat.limit > 0 ? Math.min(100, Math.round((usage.chat.used / usage.chat.limit) * 100)) : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-[#8b8b8b]">練習メニュー</span>
              <span className="font-medium">{usage.plan.used}/{usage.plan.limit}回</span>
            </div>
            <div className="h-2 rounded-full bg-[#ebf1eb] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usage.plan.limit > 0 && usage.plan.used / usage.plan.limit >= 0.9 ? "bg-red-500" : usage.plan.limit > 0 && usage.plan.used / usage.plan.limit >= 0.7 ? "bg-yellow-500" : "bg-[#006728]"
                }`}
                style={{ width: `${usage.plan.limit > 0 ? Math.min(100, Math.round((usage.plan.used / usage.plan.limit) * 100)) : 0}%` }}
              />
            </div>
            {usage.limitReached && (
              <p className="text-sm text-red-500 font-medium mt-1">
                今月の利用上限に達しました。来月リセットされます。
              </p>
            )}
          </div>
        ) : usageLoaded ? (
          <p className="text-center text-base text-[#8b8b8b] py-2">利用データなし</p>
        ) : (
          <div className="py-2 animate-pulse"><div className="h-4 w-3/4 mx-auto rounded bg-gray-200" /></div>
        )}
      </div>

      {/* データエクスポート */}
      <p className="text-base font-bold text-white px-1 pt-4">データエクスポート</p>
      <ExportSection />

      {/* 法的情報 */}
      <h3 className="px-1 pt-2 text-lg font-bold text-white">サポート</h3>
      <div className="rounded-lg bg-white p-3">
        <div className="flex flex-col">
          {[
            { href: "/help/contact", label: "お問い合わせ" },
            { href: "/terms", label: "利用規約" },
            { href: "/privacy", label: "プライバシーポリシー" },
            { href: "/legal", label: "特定商取引法に基づく表記" },
            { href: "/help", label: "ご利用ガイド" },
          ].map((item, i, arr) => (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-2.5 py-2.5 ${i < arr.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                <span className="flex-1 text-base font-bold">{item.label}</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" style={{ width: "auto", height: "auto" }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ログアウト・退会 */}
      <div className="flex flex-col items-center gap-3 pt-4 pb-8">
        <button
          onClick={async () => {
            setProcessing("ログアウト中...");
            await liffLogout();
          }}
          className="w-full max-w-xs rounded-full border border-white py-2.5 text-base font-bold text-white"
        >
          ログアウト
        </button>
        <Link href="/settings/delete-account" className="text-sm font-bold text-white mt-4">
          アカウント削除（退会）
        </Link>
      </div>
      </div>

      {/* Link toast */}
      {linkToast && (
        <div className="fixed bottom-[calc(var(--bottom-nav-height)+16px)] left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-full bg-[#333] px-5 py-2.5 text-sm font-medium text-white shadow-lg">
            {linkToast}
          </div>
        </div>
      )}
    </div>
  );
}

function ExportSection() {
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleExport(type: string, label: string) {
    setDownloading(type);
    try {
      const res = await apiFetch(`/api/export?type=${type}`);
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `waggly-${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(`Export ${label} failed:`, e);
      showError(e);
    } finally {
      setDownloading(null);
    }
  }

  const items = [
    { type: "clubs", label: "マイバッグ" },
    { type: "items", label: "アイテム" },
    { type: "practice", label: "練習記録" },
  ];

  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-sm text-[#8b8b8b] mb-2">登録データをCSVファイルでダウンロードできます。</p>
      <div className="flex flex-col">
        {items.map((item, i) => (
          <button
            key={item.type}
            onClick={() => handleExport(item.type, item.label)}
            disabled={downloading !== null}
            className={`flex items-center gap-2.5 py-2.5 text-left ${i < items.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}
          >
            {downloading === item.type ? (
              <Loader2 className="h-4 w-4 text-[#006728] animate-spin shrink-0" />
            ) : (
              <Download className="h-4 w-4 text-[#006728] shrink-0" />
            )}
            <span className="flex-1 text-base font-bold">{item.label}</span>
            <span className="text-xs text-[#8b8b8b] border border-[#c4c4c4] rounded-full px-2.5 py-0.5">CSV</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AccountLinking({
  user,
  onConflict,
  setProcessing,
}: {
  user: User;
  onConflict: (info: ConflictInfo) => void;
  setProcessing: (msg: string | null) => void;
}) {
  const { setUser } = useAuth();
  const router = useRouter();
  const [providers, setProviders] = useState<{ provider: string; provider_email?: string; is_current?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLineApp, setIsLineApp] = useState(false);

  useEffect(() => {
    import("@/lib/platform").then(({ isLineBrowser }) => setIsLineApp(isLineBrowser()));
    apiFetch("/api/auth/providers")
      .then((r) => r.ok ? r.json() : [])
      .then(setProviders)
      .catch((e) => showError(e))
      .finally(() => setLoading(false));
  }, []);

  const hasLine = providers.some((p) => p.provider === "line");
  const hasGoogle = providers.some((p) => p.provider === "google");
  const hasFacebook = providers.some((p) => p.provider === "facebook");
  const canUnlinkLine = providers.length >= 2 && !providers.find((p) => p.provider === "line")?.is_current;
  const canUnlinkGoogle = providers.length >= 2 && !providers.find((p) => p.provider === "google")?.is_current;
  const canUnlinkFacebook = providers.length >= 2 && !providers.find((p) => p.provider === "facebook")?.is_current;

  async function unlinkProvider(provider: "line" | "google" | "facebook") {
    const label = provider === "line" ? "LINE" : provider === "facebook" ? "Facebook" : "Google";
    if (!confirm(`${label}の連携を解除しますか？`)) return;
    setProcessing("解除中...");
    try {
      const res = await apiFetch("/api/auth/link-provider", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.needsRelogin) {
          const { createClient } = await import("@/lib/supabase/client");
          await createClient().auth.signOut();
          setUser?.(null);
          router.push("/");
          return;
        }
        const updated = await apiFetch("/api/auth/providers").then(r => r.ok ? r.json() : []);
        setProviders(updated);
      } else {
        const err = await res.json();
        alert(err.error || "解除に失敗しました");
      }
    } finally {
      setProcessing(null);
    }
  }

  async function linkLine() {
    try {
      if (isNative()) {
        setProcessing("連携中...");
        const { nativeLineLogin } = await import("@/lib/native-auth");
        const result = await nativeLineLogin();
        if (result.error) {
          if (!result.error.includes("cancel")) alert(result.error);
          setProcessing(null);
          return;
        }
        if (!result.accessToken) {
          alert("LINE accessToken が取得できませんでした");
          setProcessing(null);
          return;
        }
        const res = await apiFetch("/api/auth/link-provider", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "line", accessToken: result.accessToken }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "連携に失敗しました");
          setProcessing(null);
          return;
        }
        const linkResult = await res.json();
        if (linkResult.needsConfirm) {
          setProcessing(null);
          handleLinkConflict("line", linkResult);
          return;
        }
        const updated = await apiFetch("/api/auth/providers").then(r => r.ok ? r.json() : []);
        setProviders(updated);
        setProcessing(null);
        return;
      }
      // Web: LINE OAuth redirect — no processing state needed (browser navigates)
      const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
      if (!channelId) {
        alert("LINE Channel ID が設定されていません");
        return;
      }
      sessionStorage.setItem("link_original_user", user.id);
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/line/callback?link=1`);
      const state = crypto.randomUUID();
      window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${redirectUri}&state=${state}&scope=openid%20profile`;
    } catch (e: unknown) {
      console.error("linkLine error:", e);
      alert(e instanceof Error ? e.message : "LINE連携に失敗しました");
      setProcessing(null);
    }
  }

  function linkFacebook() {
    const state = btoa(JSON.stringify({ originalUser: user.id }));
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/facebook-link/callback`);
    window.location.href = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${encodeURIComponent(state)}&scope=email,public_profile`;
  }

  async function linkGoogle() {
    // LINE内ブラウザの場合は外部ブラウザで開く
    const { isLineBrowser } = await import("@/lib/platform");
    if (isLineBrowser()) {
      window.open(`${window.location.origin}/settings`, "_blank");
      return;
    }
    const state = btoa(JSON.stringify({ originalUser: user.id }));
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/google-link/callback`);
    window.location.href = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&state=${encodeURIComponent(state)}&prompt=select_account`;
  }

  function handleLinkConflict(provider: string, linkResult: { providerId: string; currentAccount: { lastUpdated: string | null; counts: ConflictSource["counts"] }; existingAccount: { id: string; lastUpdated: string | null; counts: ConflictSource["counts"] } }) {
    onConflict({
      scenario: "account-linking",
      provider,
      providerSub: linkResult.providerId,
      sourceA: {
        label: "現在のアカウントのデータ",
        isNew: true,
        wid: user.id,
        lastUpdated: linkResult.currentAccount.lastUpdated,
        counts: linkResult.currentAccount.counts,
      },
      sourceB: {
        label: `${provider === "google" ? "Google" : provider === "facebook" ? "Facebook" : "LINE"}アカウントのデータ`,
        isNew: false,
        wid: linkResult.existingAccount.id,
        lastUpdated: linkResult.existingAccount.lastUpdated,
        counts: linkResult.existingAccount.counts,
      },
    });
  }

  const googleEmail = user.google_email ?? providers.find((p) => p.provider === "google")?.provider_email;

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
      <div className="flex items-center justify-between py-2 border-b border-[#ececec]">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#06C755"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
          <span className="text-base">LINE</span>
        </div>
        {loading ? (
          <div className="h-5 w-16 rounded bg-gray-100 animate-pulse" />
        ) : hasLine ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#006728] font-bold">連携済み</span>
            {canUnlinkLine && (
              <button onClick={() => unlinkProvider("line")} className="text-xs text-[#8b8b8b] border border-[#c4c4c4] rounded-full px-2.5 py-0.5">解除</button>
            )}
          </div>
        ) : (
          <button onClick={linkLine} className="text-sm font-bold text-[#006728] border border-[#006728] rounded-full px-3 py-1">連携する</button>
        )}
      </div>
      <div className="flex items-center justify-between py-2 border-b border-[#ececec]">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" style={{color:"#1877F2"}}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          <span className="text-base">Facebook</span>
        </div>
        {loading ? (
          <div className="h-5 w-16 rounded bg-gray-100 animate-pulse" />
        ) : hasFacebook ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#006728] font-bold">連携済み</span>
            {canUnlinkFacebook && (
              <button onClick={() => unlinkProvider("facebook")} className="text-xs text-[#8b8b8b] border border-[#c4c4c4] rounded-full px-2.5 py-0.5">解除</button>
            )}
          </div>
        ) : (
          <button onClick={linkFacebook} className="text-sm font-bold text-[#006728] border border-[#006728] rounded-full px-3 py-1">連携する</button>
        )}
      </div>
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          <span className="text-base">Google</span>
        </div>
        {loading ? (
          <div className="h-5 w-16 rounded bg-gray-100 animate-pulse" />
        ) : hasGoogle ? (
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#006728] font-bold shrink-0">連携済み</span>
              {canUnlinkGoogle && (
                <button onClick={() => unlinkProvider("google")} className="text-xs text-[#8b8b8b] border border-[#c4c4c4] rounded-full px-2.5 py-0.5 shrink-0">解除</button>
              )}
            </div>
            {googleEmail && <span className="text-xs text-[#8b8b8b]">{googleEmail}</span>}
          </div>
        ) : (
          <button onClick={linkGoogle} className="text-sm font-bold text-[#006728] border border-[#006728] rounded-full px-3 py-1">連携する</button>
        )}
      </div>
      {isLineApp && !googleEmail && (
        <p className="text-xs text-[#8b8b8b] px-1 -mt-1">LINEアプリ内ではGoogle連携を利用できません。外部ブラウザを起動します。</p>
      )}
    </div>
  );
}

// ProcessingOverlay is now imported from @/components/ui/processing-overlay
