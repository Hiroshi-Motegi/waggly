"use client";

import { Loading } from "@/components/loading";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { liffLogout } from "@/lib/liff";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/page-header";

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
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/usage").then((r) => r.ok ? r.json() : null).then(setUsage).catch(() => {});
    fetch("/api/subscription").then((r) => r.ok ? r.json() : null).then(setSubscription).catch(() => {});
  }, [user]);

  if (!user) return null;

  const usagePercent = usage ? Math.min(100, Math.round((usage.totalTokens / usage.limit) * 100)) : 0;
  const isFreePlan = subscription?.plan_id === "free" || !subscription?.plan_id;
  const isFreeTrialActive = subscription?.free_until && new Date(subscription.free_until) > new Date();

  return (
    <div className="relative flex flex-col px-2 py-2 space-y-2 bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <img src="/images/home-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-2">
      <PageHeader title="設定" variant="dark" />

      {/* プロフィール */}
      <div className="rounded-lg bg-white p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="text-lg">{user.display_name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-bold">{user.display_name}</p>
            <p className="text-xs text-[#8b8b8b]">LINE連携済み</p>
          </div>
        </div>
      </div>

      {/* プラン */}
      <p className="text-base font-bold text-[#006728] px-1 pt-4">プラン</p>
      <div className="rounded-lg bg-white p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold">ベータ版</span>
          <span className="rounded-full bg-[#ebf1eb] px-2.5 py-0.5 text-xs font-bold text-[#006728]">
            無料提供中
          </span>
        </div>
        <p className="text-xs text-[#8b8b8b]">
          現在ベータ版として全機能を無料で提供しています。正式リリース時にプラン体系が変更される場合があります。
        </p>
      </div>

      {/* AIコーチ利用状況 */}
      <p className="text-base font-bold text-[#006728] px-1 pt-4">AI相談利用状況</p>
      <div className="rounded-lg bg-white p-3">
        {usage ? (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
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
            <div className="flex justify-between text-[10px] text-[#8b8b8b]">
              <span>使用率 {usagePercent}%</span>
              <span>残り {usage.remaining.toLocaleString()} トークン</span>
            </div>
            {usage.limitReached && (
              <p className="text-xs text-red-500 font-medium">
                今月の利用上限に達しました。来月リセットされます。
              </p>
            )}
          </div>
        ) : (
          <Loading />
        )}
      </div>

      {/* データエクスポート */}
      <p className="text-base font-bold text-[#006728] px-1 pt-4">データエクスポート</p>
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
                <span className="flex-1 text-sm font-bold">{item.label}</span>
                <Image src="/icons/chevron-right.svg" alt="" width={6} height={10} className="opacity-60" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ログアウト */}
      <div className="flex flex-col items-center pt-4">
        <button
          onClick={liffLogout}
          className="w-full max-w-xs rounded-full border border-[#c4c4c4] py-2.5 text-sm font-bold text-[#8b8b8b]"
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
      const res = await fetch(`/api/export?type=${type}`);
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
      <p className="text-xs text-[#8b8b8b] mb-2">登録データをCSVファイルでダウンロードできます。</p>
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
            <span className="flex-1 text-sm font-bold">{item.label}</span>
            <span className="text-xs text-[#8b8b8b]">CSV</span>
          </button>
        ))}
      </div>
    </div>
  );
}
