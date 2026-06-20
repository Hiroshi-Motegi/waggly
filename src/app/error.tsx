"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

const links = [
  { href: "/", label: "ホーム", icon: "/icons/nav-home-w.svg" },
  { href: "/bag", label: "マイバッグ", icon: "/icons/nav-bag-w.svg" },
  { href: "/items", label: "アイテム", icon: "/icons/nav-items-w.svg" },
  { href: "/practice", label: "練習記録", icon: "/icons/nav-practice-w.svg" },
  { href: "/settings/share", label: "マイ名刺", icon: "/icons/nav-card-w.svg" },
  { href: "/coach", label: "AI相談", icon: "/icons/nav-ai-w.svg" },
  { href: "/catalog", label: "クラブカタログ", icon: "/icons/nav-catalog-w.svg" },
  { href: "/help", label: "ご利用ガイド", icon: "/icons/nav-help-w.svg" },
];

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center min-h-[60vh] px-4 pt-12 pb-16 text-center">
      <Image src="/images/witb-waggly-text.png" alt="Waggly" width={140} height={45} priority />

      <p className="text-[96px] font-thin leading-none text-white tracking-[0.15em] select-none mt-10">
        500
      </p>
      <Image src="/ball/ball-sad-w.png" alt="" width={64} height={64} className="mt-4" />
      <p className="text-2xl font-thin text-white mt-4 tracking-wider">エラーが発生しました</p>

      <button
        onClick={reset}
        className="mt-6 rounded-full border border-white/30 px-5 py-1.5 text-sm text-white/70 hover:text-white hover:border-white/60 transition-colors"
      >
        再試行
      </button>

      <div className="mt-12 w-full border-t border-white/15 pt-8 px-4">
        <p className="text-sm text-white text-center mb-8">下記よりお探しのコンテンツへアクセスください</p>
        <div className="grid grid-cols-3 gap-y-6">
          {links.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1.5 text-white hover:text-white/70 transition-colors"
            >
              <Image src={icon} alt="" width={40} height={40} />
              <span className="text-sm">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
