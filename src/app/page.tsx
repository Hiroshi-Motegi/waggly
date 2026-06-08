"use client";

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
    return <p className="p-4 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">LINEでログインしてください</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-2 py-6">
      <p className="text-center text-lg font-medium">
        こんにちは、{user.display_name}さん
      </p>

      <div className="grid grid-cols-2 gap-2">
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

      <RecentPractice sessions={sessions} />
    </div>
  );
}
