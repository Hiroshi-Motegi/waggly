"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const menuLinks = [
  { href: "/catalog", label: "クラブカタログ", icon: "/icons/nav-catalog.svg" },
  { href: "/compare", label: "クラブ比較", icon: "/icons/nav-guide.svg" },
  { href: "/news", label: "ニュース", icon: "/icons/nav-news.svg" },
  { href: "/help", label: "ヘルプ", icon: "/icons/nav-help.svg" },
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
];

export function PublicMenuButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-1">
        <Image src="/icons/menu-w.svg" alt="メニュー" width={24} height={24} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-center">
          <div className="relative w-full max-w-screen-sm">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            {/* Drawer */}
            <div className="absolute top-0 left-0 bottom-0 w-[80%] bg-[#1a3a1a] z-10 shadow-xl animate-fade-in">
              <div className="flex items-center justify-end px-2 py-2">
                <button onClick={() => setOpen(false)} className="text-white/60 text-xl p-1">✕</button>
              </div>
              <nav className="py-2">
                {menuLinks.map(({ href, label, icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/10 transition-colors"
                  >
                    {icon && <Image src={icon} alt="" width={20} height={20} className="invert opacity-70" />}
                    {!icon && <span className="w-5" />}
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="px-4 mt-4">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex h-10 items-center justify-center rounded-full bg-white/10 border border-white/20 text-sm text-white font-medium"
                >
                  ログイン・新規登録
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
