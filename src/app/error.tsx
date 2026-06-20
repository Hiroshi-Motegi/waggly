"use client";

import Link from "next/link";
import { useEffect } from "react";

const links = [
  { href: "/", label: "ホーム" },
  { href: "/bag", label: "マイバッグ" },
  { href: "/items", label: "アイテム" },
  { href: "/practice", label: "練習記録" },
  { href: "/settings/share", label: "マイ名刺" },
  { href: "/coach", label: "AI相談" },
  { href: "/catalog", label: "クラブカタログ" },
  { href: "/help", label: "ヘルプ" },
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16 text-center">
      <p className="text-[96px] font-thin leading-none text-white tracking-[0.15em] select-none">
        500
      </p>
      <p className="text-2xl font-thin text-white mt-2 tracking-wider">エラーが発生しました</p>

      <button
        onClick={reset}
        className="mt-6 rounded-full border border-white/30 px-5 py-1.5 text-sm text-white/70 hover:text-white hover:border-white/60 transition-colors"
      >
        再試行
      </button>

      <div className="mt-8 w-full max-w-sm border-t border-white/15 pt-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
