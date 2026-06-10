"use client";

import { Loading } from "@/components/loading";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { usePracticeSessions } from "@/hooks/use-practice";
import { useProfile } from "@/hooks/use-profile";
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
          <button
            onClick={async () => {
              const { initLiff } = await import("@/lib/liff");
              await initLiff();
              const liffMod = await import("@line/liff");
              if (!liffMod.default.isLoggedIn()) {
                liffMod.default.login();
              }
            }}
            className="mt-12 flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[#06C755] text-white font-bold text-base shadow-lg"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            LINEでログイン
          </button>
          {process.env.NODE_ENV === "development" && (
            <button
              onClick={() => { localStorage.removeItem("dev-logged-in"); window.location.reload(); }}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-full border border-white/30 text-white/70 font-bold text-base"
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
        className="absolute inset-0 w-full h-full object-cover opacity-40"
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
        <h3 className="text-base font-bold text-white px-1 mt-4 mb-1">最近の練習記録</h3>
        <RecentPractice sessions={sessions} />
      </div>
    </div>
  );
}
