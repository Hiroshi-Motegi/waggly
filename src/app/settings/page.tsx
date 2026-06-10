"use client";

import { Loading } from "@/components/loading";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { isNative } from "@/lib/platform";
import { liffLogout } from "@/lib/liff";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { useProfile } from "@/hooks/use-profile";

interface UsageData {
  month: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  limit: number;
  remaining: number;
  limitReached: boolean;
}

interface SubscriptionData {
  plan_id: string;
  plan?: { name: string; price: number; ai_monthly_tokens: number };
  status: string;
  free_until: string | null;
}

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { profile } = useProfile();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/usage").then((r) => r.ok ? r.json() : null).then(setUsage).catch(() => {}).finally(() => setUsageLoaded(true));
    apiFetch("/api/subscription").then((r) => r.ok ? r.json() : null).then(setSubscription).catch(() => {});
  }, [user]);

  if (!user && isNative()) {
    return (
      <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
        <img src="/images/home-bg.jpg" alt="" className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
        <div className="relative z-10 flex flex-col space-y-2">
          <PageHeader title="設定" variant="dark" />
          <div className="rounded-lg bg-white p-4">
            <h3 className="text-base font-bold mb-2">アカウント</h3>
            <p className="text-sm text-[#8b8b8b] mb-3">サインインするとプロフィール公開・共有、AIコーチ、データのバックアップ・Web版との同期が使えます。</p>
            <button
              onClick={async () => {
                const { signInWithGoogle } = await import("@/lib/native-auth");
                const result = await signInWithGoogle();
                if (result.user) {
                  setUser?.(result.user);
                  window.location.reload();
                }
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#006728] text-white text-base font-bold"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Googleでサインイン
            </button>
          </div>
          <div className="rounded-lg bg-white p-3">
            <div className="flex flex-col gap-2">
              <Link href="/terms" className="flex items-center justify-between py-2 border-b border-[#dfdfdf]">
                <span className="text-base">利用規約</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40" />
              </Link>
              <Link href="/privacy" className="flex items-center justify-between py-2">
                <span className="text-base">プライバシーポリシー</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-40" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const usagePercent = usage ? Math.min(100, Math.round((usage.totalTokens / usage.limit) * 100)) : 0;
  const isFreePlan = subscription?.plan_id === "free" || !subscription?.plan_id;
  const isFreeTrialActive = subscription?.free_until && new Date(subscription.free_until) > new Date();

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="設定" variant="dark" />

      {/* プロフィール */}
      <div className="rounded-lg bg-white p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14">
            <AvatarImage src={profile?.avatar_url ?? user.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg">{(profile?.nickname ?? user.display_name ?? "?")[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-bold">{profile?.nickname || user.display_name}</p>
            <p className="text-sm text-[#8b8b8b]">{user.line_user_id && !user.line_user_id.startsWith("google-") && !user.line_user_id.startsWith("oauth-") && !user.line_user_id.startsWith("dev-") ? "LINE連携済み" : "オンライン"}</p>
          </div>
        </div>
      </div>

      {/* プロフィール・共有設定 */}
      <div className="flex flex-col rounded-lg bg-white p-3">
        <Link href="/settings/profile">
          <div className="flex items-center justify-between py-3 border-b border-[#ececec]">
            <span className="text-base">プロフィール設定</span>
            <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" />
          </div>
        </Link>
        <Link href="/settings/profile/courses">
          <div className="flex items-center justify-between py-3 border-b border-[#ececec]">
            <span className="text-base">お気に入りコース</span>
            <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" />
          </div>
        </Link>
        <Link href="/settings/share">
          <div className="flex items-center justify-between py-3">
            <span className="text-base">名刺・共有設定</span>
            <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" />
          </div>
        </Link>
      </div>

      {/* アカウント連携 */}
      <p className="text-base font-bold text-white px-1 pt-4">アカウント連携</p>
      <div className="flex flex-col gap-1 rounded-lg bg-white p-3">
        <div className="flex items-center justify-between py-2 border-b border-[#ececec]">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#06C755"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
            <span className="text-base">LINE</span>
          </div>
          {user.line_user_id && !user.line_user_id.startsWith("google-") && !user.line_user_id.startsWith("oauth-") && !user.line_user_id.startsWith("dev-") ? (
            <span className="text-sm text-[#006728] font-bold">連携済み</span>
          ) : (
            <button
              onClick={async () => {
                const channelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
                const redirectUri = encodeURIComponent(`${window.location.origin}/auth/line/callback?link=1`);
                const state = crypto.randomUUID();
                window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${redirectUri}&state=${state}&scope=openid%20profile`;
              }}
              className="text-sm font-bold text-[#006728] border border-[#006728] rounded-full px-3 py-1"
            >
              連携する
            </button>
          )}
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            <span className="text-base">Google</span>
          </div>
          {user.google_id ? (
            <span className="text-sm text-[#006728] font-bold">連携済み</span>
          ) : (
            <button
              onClick={async () => {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: `${window.location.origin}/auth/callback?link=google` },
                });
              }}
              className="text-sm font-bold text-[#006728] border border-[#006728] rounded-full px-3 py-1"
            >
              連携する
            </button>
          )}
        </div>
      </div>

      {/* プラン */}
      <p className="text-base font-bold text-white px-1 pt-4">プラン</p>
      <div className="rounded-lg bg-white p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-base font-bold">ベータ版</span>
          <span className="rounded-full bg-[#ebf1eb] px-2.5 py-0.5 text-sm font-bold text-[#006728]">
            無料提供中
          </span>
        </div>
        <p className="text-sm text-[#8b8b8b]">
          現在ベータ版として全機能を無料で提供しています。正式リリース時にプラン体系が変更される場合があります。
        </p>
      </div>

      {/* AIコーチ利用状況 */}
      <p className="text-base font-bold text-white px-1 pt-4">AI相談利用状況</p>
      <div className="rounded-lg bg-white p-3">
        {usage ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#8b8b8b]">{usage.month}月</span>
              <span className="font-medium">
                {usage.totalTokens.toLocaleString()} / {usage.limit.toLocaleString()} トークン
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#ebf1eb] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-yellow-500" : "bg-[#006728]"
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[#8b8b8b]">
              <span>使用率 {usagePercent}%</span>
              <span>残り {usage.remaining.toLocaleString()} トークン</span>
            </div>
            {usage.limitReached && (
              <p className="text-sm text-red-500 font-medium">
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
      <div className="rounded-lg bg-white p-3">
        <div className="flex flex-col">
          {[
            { href: "/terms", label: "利用規約" },
            { href: "/privacy", label: "プライバシーポリシー" },
          ].map((item, i, arr) => (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-2.5 py-2.5 ${i < arr.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                <span className="flex-1 text-base font-bold">{item.label}</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ログアウト */}
      <div className="flex flex-col items-center pt-4 pb-8">
        <button
          onClick={liffLogout}
          className="w-full max-w-xs rounded-full border border-white py-2.5 text-base font-bold text-white"
        >
          ログアウト
        </button>
      </div>
      </div>
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
            <span className="text-sm text-[#8b8b8b]">CSV</span>
          </button>
        ))}
      </div>
    </div>
  );
}
