"use client";

import { Loading } from "@/components/loading";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { usePracticeSessions } from "@/hooks/use-practice";
import { useProfile, useFavoriteCourses } from "@/hooks/use-profile";
import { isNative } from "@/lib/platform";
import { RecentPractice } from "@/components/home/recent-practice";

const featureCards = [
  {
    href: "/bag",
    icon: "/icons/my-bag.svg",
    label: "マイバッグ",
  },
  {
    href: "/items",
    icon: "/icons/items.svg",
    label: "アイテム",
  },
  {
    href: "/courses",
    icon: "/icons/golf-course.svg",
    label: "ゴルフ場を探す",
    sub: "楽天GORA",
  },
  {
    href: "/coach/plans",
    icon: "/icons/practice-menu.svg",
    label: "練習メニュー",
    sub: "AIに練習メニューを相談",
  },
];

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { courses: favCourses } = useFavoriteCourses();
  const { sessions } = usePracticeSessions();
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const forceGuest = searchParams.get("guest") !== null;

  if (authLoading && !forceGuest) {
    return <Loading variant="light" />;
  }

  if (forceGuest || (!user && !isNative())) {
    return (
      <div className="relative flex flex-col items-center justify-center bg-[#139847]" style={{ minHeight: "100dvh" }}>
        <img src="/images/home-bg.jpg" alt="" className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center px-8 w-full max-w-sm">
          <Image
            src="/icons/waggly-logo.svg"
            alt="Waggly"
            width={200}
            height={61}
            priority
            className="brightness-0 invert"
          />
          <p className="mt-3 text-base text-white/80 text-center">
            ゴルフギアの管理をこれ一つで
          </p>
          {/* LINE login */}
          <button
            onClick={async () => {
              const { createClient } = await import("@/lib/supabase/client");
              const supabase = createClient();
              await supabase.auth.signInWithOAuth({
                provider: "custom:line" as any,
                options: { redirectTo: `${window.location.origin}/auth/callback` },
              });
            }}
            className="mt-12 flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[#06C755] text-white font-bold text-base shadow-lg"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            LINEでログイン
          </button>
          {/* Google login */}
          <button
            onClick={async () => {
              const { createClient } = await import("@/lib/supabase/client");
              const supabase = createClient();
              await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/auth/callback` },
              });
            }}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white text-gray-800 font-bold text-base shadow-lg"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Googleでログイン
          </button>
          {process.env.NODE_ENV === "development" && (
            <button
              onClick={() => { localStorage.removeItem("dev-logged-in"); window.location.reload(); }}
              className="mt-3 flex h-12 w-full items-center justify-center rounded-full border border-white/30 text-white/70 font-bold text-base"
            >
              開発ログイン
            </button>
          )}
          <div className="flex gap-4 mt-6">
            <Link href="/terms" className="text-xs text-white/50">利用規約</Link>
            <Link href="/privacy" className="text-xs text-white/50">プライバシーポリシー</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-[#139847]" style={{ minHeight: "100dvh", paddingBottom: "var(--bottom-nav-height)", marginBottom: "calc(-1 * var(--bottom-nav-height))" }}>
      {/* Background image covers entire page */}
      <img
        src="/images/home-bg.jpg"
        alt=""
        className="fixed inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
      />
      <div className="relative z-10 flex flex-col px-2 pt-2 pb-4">
        {/* Logo */}
        <div className="flex items-center justify-center w-full relative h-14">
          <Image
            src="/icons/waggly-logo.svg"
            alt="Waggly"
            width={151}
            height={46}
            priority
            className="brightness-0 invert"
          />
          <Link href="/settings" className="absolute right-2">
            {(profile?.avatar_url ?? user?.avatar_url) ? (
              <img src={profile?.avatar_url ?? user?.avatar_url ?? ""} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-white/30 flex items-center justify-center text-white text-base font-bold">
                {(profile?.nickname ?? user?.display_name)?.[0] ?? "G"}
              </div>
            )}
          </Link>
        </div>

        {/* Greeting */}
        <p className="text-lg font-medium text-white text-center mt-2">
          {(() => { const h = new Date().getHours(); return h >= 18 || h < 4 ? "こんばんは" : "こんにちは"; })()}{user ? `、${profile?.nickname || user.display_name}さん` : ""}
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-2 w-full mt-4">
          {featureCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <div className="flex flex-col items-center justify-center gap-[5px] rounded-lg border border-[#72937f] bg-white p-5 h-[121px] drop-shadow-[2px_2px_0px_#72937f]">
                <Image src={card.icon} alt={card.label} width={48} height={48} />
                <div className="flex flex-col items-center gap-[2px] text-center">
                  <span className="text-base font-bold text-[#006728]">{card.label}</span>
                  {card.sub && (
                    <span className="text-xs text-[#717171]">{card.sub}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent practice */}
        <div className="flex items-center px-1 mt-4 mb-2">
          <h3 className="flex-1 text-base font-bold text-white">最近の練習記録</h3>
          <Link href="/practice" className="rounded-full border border-white px-3 py-0.5 text-sm font-bold text-white">すべて見る</Link>
        </div>
        <RecentPractice sessions={sessions} />

        {/* Favorite courses */}
        {favCourses.length > 0 && (
          <>
            <div className="flex items-center px-1 mt-4 mb-2">
          <h3 className="flex-1 text-base font-bold text-white">お気に入りコース</h3>
          <Link href="/settings/profile/courses" className="rounded-full border border-white px-3 py-0.5 text-sm font-bold text-white">管理</Link>
        </div>
            <div className="rounded-lg bg-white p-3">
              {favCourses.map((c, i) => {
                const goraUrl = c.gora_course_id
                  ? `https://hb.afl.rakuten.co.jp/hgc/${process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID ?? ""}/gora/detail/id=${c.gora_course_id}/`
                  : null;
                return (
                  <a key={c.id} href={goraUrl ?? "#"} target={goraUrl ? "_blank" : undefined} rel="noopener" className={`flex items-center gap-2 py-2 ${i < favCourses.length - 1 ? "border-b border-[#dfdfdf]" : ""}`}>
                    {c.course_image_url && (
                      <img src={c.course_image_url} alt="" className="h-10 w-14 rounded object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{c.course_name}</p>
                      {c.address && <p className="text-xs text-[#8b8b8b] truncate">{c.address}</p>}
                    </div>
                    {c.evaluation != null && (
                      <span className="text-xs text-amber-500 shrink-0">★{c.evaluation.toFixed(1)}</span>
                    )}
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
