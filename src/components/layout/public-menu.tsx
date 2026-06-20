"use client";

import { useState, useEffect } from "react";
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    }
  }, [open]);

  function close() {
    setVisible(false);
    setTimeout(() => setOpen(false), 300);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-1">
        <Image src="/icons/menu-w.svg" alt="メニュー" width={24} height={24} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-center">
          <div className="relative w-full max-w-screen-sm">
            <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`} onClick={close} />
            <div className={`absolute inset-0 bg-[#1a3a1a]/95 z-10 overflow-y-auto transition-transform duration-300 ease-out ${visible ? "translate-y-0" : "-translate-y-full"}`}>
              <div className="flex items-center justify-end px-2 py-2">
                <button onClick={close} className="text-white/60 text-xl p-1">✕</button>
              </div>
              <nav className="py-2">
                {menuLinks.map(({ href, label, icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className="flex items-center gap-3 px-5 py-3.5 text-base text-white/80 hover:bg-white/10 transition-colors"
                  >
                    {icon && <Image src={icon} alt="" width={28} height={28} className="invert opacity-70" />}
                    {!icon && <span className="w-7" />}
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="px-5 mt-6">
                <Link
                  href="/login"
                  onClick={close}
                  className="flex h-11 items-center justify-center rounded-full bg-white/10 border border-white/20 text-sm text-white font-medium"
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
