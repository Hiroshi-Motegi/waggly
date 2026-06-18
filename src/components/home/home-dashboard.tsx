"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { usePracticeSessions } from "@/hooks/use-practice";
import { useProfile, useFavoriteCourses } from "@/hooks/use-profile";
import { RecentPractice } from "@/components/home/recent-practice";
import { AdBanner } from "@/components/ad-banner";

const featureCards = [
  { href: "/bag", icon: "/icons/my-bag.svg", label: "マイバッグ" },
  { href: "/items", icon: "/icons/items.svg", label: "アイテム" },
  { href: "/courses", icon: "/icons/golf-course.svg", label: "コースを探す" },
  { href: "/settings/share", icon: "/icons/my-card.svg", label: "マイ名刺" },
  { href: "/practice", icon: "/icons/nav-practice-g.svg", label: "練習記録" },
  { href: "/settings", icon: "/icons/settings.svg", label: "設定" },
];

export function HomeDashboard() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { courses: favCourses } = useFavoriteCourses();
  const { sessions } = usePracticeSessions();

  return (
    <div className="relative" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      <div className="relative flex flex-col px-2 pt-2 pb-4">
        {/* Logo */}
        <div className="flex items-center justify-center w-full relative h-14">
          <Image src="/icons/waggly-logo-white.svg" alt="Waggly" width={151} height={46} priority style={{ width: 151, height: 46 }} />
          <Link href="/settings" className="absolute right-2">
            {profileLoading ? (
              <div className="h-10 w-10 rounded-full bg-white/20 border-2 border-white/60" />
            ) : (profile?.avatar_url ?? user?.avatar_url) ? (
              <img src={profile?.avatar_url ?? user?.avatar_url ?? ""} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white/60" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/30 border-2 border-white/60 flex items-center justify-center text-white text-base font-bold">
                {(profile?.nickname ?? user?.display_name)?.[0] ?? "G"}
              </div>
            )}
          </Link>
        </div>

        {/* Greeting */}
        <p className="text-lg font-medium text-white text-center mt-2">
          {(() => { const h = new Date().getHours(); return h >= 18 || h < 4 ? "こんばんは" : "こんにちは"; })()}{user && !profileLoading ? `、${profile?.nickname || user.display_name}さん` : ""}
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-2 w-full mt-4">
          {featureCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <div className="flex flex-col items-center justify-center gap-[5px] rounded-lg border border-[#72937f] bg-white p-3 h-[110px] drop-shadow-[2px_2px_0px_#72937f]">
                <Image src={card.icon} alt={card.label} width={40} height={40} />
                <div className="flex flex-col items-center gap-[2px] text-center">
                  <span className="text-sm font-bold text-[#006728]">{card.label}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Contents bar */}
        <div className="flex gap-3 items-start rounded-[9px] bg-[#35611d] px-3 py-4 w-full mt-4">
          {[
            { href: "/catalog", icon: "/icons/content-catalog.svg", label: "クラブカタログ" },
            { href: "/compare", icon: "/icons/content-compare.svg", label: "クラブ比較" },
            { href: "/coach/plans", icon: "/icons/content-practice-menu.svg", label: "練習メニュー" },
            { href: "/coach", icon: "/icons/content-ai-chat.svg", label: "AI相談" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex flex-1 flex-col items-center gap-[3px]">
              <Image src={item.icon} alt={item.label} width={32} height={32} />
              <span className="text-[10px] font-medium text-white text-center">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* 広告バナー */}
        <div className="mt-4">
          <AdBanner slot="HOME_TOP" />
        </div>

        {/* Recent practice */}
        <div className="flex items-center px-1 mt-4 mb-2">
          <h3 className="flex-1 text-lg font-bold text-white">最近の練習記録</h3>
          <Link href="/practice" className="rounded-full border border-white px-3 py-0.5 text-sm font-bold text-white">すべて見る</Link>
        </div>
        <RecentPractice sessions={sessions} />

        {/* Favorite courses */}
        <div className="flex items-center px-1 mt-4 mb-2">
          <h3 className="flex-1 text-lg font-bold text-white">お気に入りコース</h3>
          <Link href="/courses/favorites" className="rounded-full border border-white px-3 py-0.5 text-sm font-bold text-white">すべて見る</Link>
        </div>
        <div className="rounded-lg bg-white p-3">
          {favCourses.length > 0 ? (
            favCourses.map((c, i) => {
              const goraUrl = c.gora_course_id
                ? `https://hb.afl.rakuten.co.jp/hgc/${process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID ?? ""}/?pc=${encodeURIComponent(`https://search.gora.golf.rakuten.co.jp/cal/disp/c_id/${c.gora_course_id}/`)}`
                : null;
              return (
                <a key={c.id} href={goraUrl ?? "#"} target={goraUrl ? "_blank" : undefined} rel="noopener" className={`flex items-center gap-2.5 py-2 ${i < favCourses.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                  {c.course_image_url && (
                    <img src={c.course_image_url} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold truncate">{c.course_name}</p>
                    {c.address && <p className="text-sm text-[#8b8b8b] truncate">{c.address}</p>}
                  </div>
                  {c.evaluation != null && (
                    <span className="text-xs text-amber-500 shrink-0">★{c.evaluation.toFixed(1)}</span>
                  )}
                </a>
              );
            })
          ) : (
            <div className="flex flex-col items-center px-4 py-2 gap-3">
              <p className="text-sm text-[#8b8b8b]">お気に入りはありません。</p>
              <Link href="/courses" className="w-full text-center text-sm font-bold text-[#006728] border border-[#006728] rounded-full py-2">お気に入りコースを登録する</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
