"use client";

import { Loading } from "@/components/loading";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { usePracticeSessions } from "@/hooks/use-practice";
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
  const { sessions } = usePracticeSessions();

  if (authLoading) {
    return <Loading />;
  }

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">LINEでログインしてください</p>
      </div>
    );
  }

  return (
    <>
      {/* Green hero section */}
      <div className="relative bg-[#139847] overflow-hidden">
        <img
          src="/images/home-bg.jpg"
          alt=""
          className="absolute inset-0 h-full object-cover opacity-40"
          style={{ width: "auto", minHeight: "100%" }}
        />
        <div className="relative z-10 flex flex-col items-center px-2 pt-2 pb-6">
          {/* Logo */}
          <div className="flex items-center justify-center w-full relative h-14">
            <Image
              src="/icons/waggly-logo.svg"
              alt="Waggly β"
              width={151}
              height={46}
              priority
              className="brightness-0 invert"
            />
            <Link href="/settings" className="absolute right-2">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-white/30 flex items-center justify-center text-white text-sm font-bold">
                  {user.display_name[0]}
                </div>
              )}
            </Link>
          </div>

          {/* Greeting */}
          <p className="text-lg font-medium text-white mt-2">
            こんにちは、{user.display_name}さん
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-2 w-full mt-4">
            {featureCards.map((card) => (
              <Link key={card.href} href={card.href}>
                <div className="flex flex-col items-center gap-[5px] rounded-lg border border-[#72937f] bg-white p-5 h-[121px] drop-shadow-[2px_2px_0px_#72937f]">
                  <Image src={card.icon} alt={card.label} width={48} height={48} />
                  <div className="flex flex-col items-center gap-[2px] text-center">
                    <span className="text-sm font-bold text-[#006728]">{card.label}</span>
                    {card.sub && (
                      <span className="text-[10px] text-[#717171]">{card.sub}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent practice section */}
      <div className="px-2">
        <h3 className="text-base font-bold text-white px-1 py-2">最近の練習記録</h3>
        <RecentPractice sessions={sessions} />
      </div>
    </>
  );
}
